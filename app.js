/**
 * Created by Jonathan on 2/23/17.
 */

"use strict";

// valid state abbreviations for data cleaning (some of the data includes Micronesia
// and other freely associated states)
const validStates = ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL",
  "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI",
  "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH",
  "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI",
  "WV", "WY"]
  , colors = ["#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b"]
  , domain = [1000, 3000, 5000, 7000, 9000]
  , width = 750
  , height = 500
  , margin = 40;

var centered = d3.select(null)
  , xScale
  , yScale
  , dataset;

// svg for map visualization
var svg = d3.select("#interactive")
  .attr("width", width)
  .attr("height", height)
  .on("click", stopped, true);

// svg for scatterplot visualization
var graph = d3.select("#static")
  .attr("width", width)
  .attr("height", height);

svg.append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height)
  .on("click", resetSelection);

// projection and path for map visualization
var projection = d3.geoAlbersUsa().scale(1000).translate([width / 2, height / 2]),
  path = d3.geoPath(projection);

var zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", zoomed);

var legend = d3.select("#legend");

for (var i = 0, len = colors.length; i < len; ++i) {
  var label = (i === len - 1) ? "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;>= " + domain[domain.length - 1] :
              "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;< " + domain[i];
  legend.append("li")
    .html(label)
    .style("padding-left", "25px")
    .style("white-space", "nowrap")
    .style("width", "20px")
    .style("background-color", colors[i]);
}

// handles color scale for various university data points
var colorScale = d3.scaleThreshold()
  .domain(domain)
  .range(colors);

// handles tooltip
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

var g = svg.append("g");

svg.call(zoom);

// handle data parsing
d3.queue()
  .defer(d3.json, "data/us.json")
  .defer(d3.csv, "data/CleanedData2.csv")
  .await(ready);

function draw() {
  g.selectAll("circles")
    .data(dataset)
    .enter()
    .append("circle")
    .attr("r", 3)
    .attr("fill", function(d) {
      return colorScale(d["UG"]);
    })
    .attr("transform", function(d) {
      return "translate(" + projection([d["LONGITUDE"], d["LATITUDE"]]) + ")";
    })
    .on("mouseover", mouseoverHandler)
    .on("mouseout", mouseoutHandler);
}

function selected(d) {
  if (centered.node() === this) {
    return resetSelection();
  }
  
  centered.classed("state-selected", false);
  centered = d3.select(this).classed("state-selected", true);
  
  var bounds = path.bounds(d)
    , dx = bounds[1][0] - bounds[0][0]
    , dy = bounds[1][1] - bounds[0][1]
    , x = (bounds[0][0] + bounds[1][0]) / 2
    , y = (bounds[0][1] + bounds[1][1]) / 2
    , scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)))
    , translate = [width / 2 - scale * x, height / 2 - scale * y];
  
  svg.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
}

function resetSelection() {
  centered.classed("state-selected", false);
  centered = d3.select(null);
  
  svg.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity);
}

function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  g.attr("transform", d3.event.transform);
}

function stopped() {
  if (d3.event.defaultPrevented) {
    d3.event.stopPropagation();
  }
}

// generates the scatterplot
function scatterplot() {
  var points = _.map(dataset.filter(function (d) {
    return d["MN_EARN_WNE_P10"] > 0 && d["UNEMP_RATE"] > 0;
  }), function (d) {
    return [d["MN_EARN_WNE_P10"], d["UNEMP_RATE"], d["INSTNM"]];
  });
  
  var xMax = d3.max(points, function (p) { return p[0]; })
    , yMax = d3.max(points, function (p) { return p[1]; });
  
  xScale = d3.scaleLinear().domain([0, xMax]).range([10, width - margin]);
  yScale = d3.scaleLinear().domain([0, yMax]).range([height - margin, 10]);
  
  graph.selectAll("points")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", function (d) { return xScale(d[0]); })
    .attr("cy", function (d) { return yScale(d[1]); })
    .attr("r", 5)
    .style("fill-opacity", "0.3")
    .style("stroke", "gray")
    .on("mouseover", staticMouseoverHandler)
    .on("mouseout", mouseoutHandler);
  
  var xAxis = d3.axisBottom().scale(xScale);
  var yAxis = d3.axisRight().scale(yScale);
  
  // axises
  graph.append("g")
    .attr("transform", "translate(0, " + (height - margin)+ ")")
    .call(xAxis);
  
  graph.append("g")
    .attr("transform", "translate(" + (width - margin) + ", 0)")
    .call(yAxis);
  
  // axis labels
  graph.append("text")
    .attr("transform", "translate(" + (width / 2) + ", " + (height - 4) + ")")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Mean Earnings When Not Enrolled For 10 Years ($ / year)");
  
  graph.append("text")
    .attr("transform", "rotate(90)")
    .attr("y", -width)
    .attr("x", height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Unemployment Rate (%)");
}

// filter used for interactive visualization
function filter() {
  var minUg = $("#ug-min").val()
    , maxUg = $("#ug-max").val()
    , minEarn = $("#earn-min").val()
    , maxEarn = $("#earn-max").val()
    , minCost = $("#cost-min").val()
    , maxCost = $("#cost-max").val();
  
  // clear map and scatterplot
  svg.selectAll("circle").remove();
  graph.selectAll("circle").remove();
  
  var newCoords = dataset.filter(function (d) {
    return !Number.isNaN(d["UG"]) && d["UG"] >= minUg && d["UG"] <= maxUg &&
            d["MN_EARN_WNE_P10"] >= minEarn && d["MN_EARN_WNE_P10"] <= maxEarn &&
            d["COSTT4_A"] >= minCost && d["COSTT4_A"] <= maxCost;
  });
  
  // add to map
  g.selectAll("circles")
    .data(newCoords)
    .enter()
    .append("circle")
    .attr("r", 3)
    .attr("fill", function(d) { return colorScale(d["UG"]); })
    .attr("transform", function(d) { return "translate(" + projection([d["LONGITUDE"], d["LATITUDE"]]) + ")"; })
    .on("mouseover", mouseoverHandler)
    .on("mouseout", mouseoutHandler);

  var points = _.map(newCoords.filter(function (d) {
    return d["MN_EARN_WNE_P10"] > 0 && d["UNEMP_RATE"] > 0;
  }), function (d) {
    return [d["MN_EARN_WNE_P10"], d["UNEMP_RATE"], d["INSTNM"]];
  });

  // add to scatterplot
  graph.selectAll("points")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", function (d) { return xScale(d[0]); })
    .attr("cy", function (d) { return yScale(d[1]); })
    .attr("r", 5)
    .style("fill-opacity", "0.3")
    .style("stroke", "gray")
    .on("mouseover", staticMouseoverHandler)
    .on("mouseout", mouseoutHandler);
}

// displays tooltip when mouse goes over on scatterplot visualization
function staticMouseoverHandler(d) {
  div.transition()
    .duration(200)
    .style("opacity", 0.9);
  
  div.html(d[2] + "<br>" +
      (Number.isNaN(d[0]) ? "" : "Mean Earnings After 10 Years: $" + d[0]) +
      "<br>" +
      (Number.isNaN(d[1]) ? "" : "Unemployment Rate: " + d[1] + "%"))
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px");
}

// displays tooltip when mouse goes over on map visualization
function mouseoverHandler(d) {
  div.transition()
    .duration(200)
    .style("opacity", 0.9);
  
  div.html(d["INSTNM"] + "<br>" +
      (d["UG"] == 0 ? "" : "Undergrad Population: " + d["UG"]) +
      "<br>" +
      (d["COSTT4_A"] == 0 ? "" : "Cost for Attendance: $" + d["COSTT4_A"]) +
      "<br>" +
      (d["MN_EARN_WNE_P10"] == 0 ? "" : "Mean Earnings After 10 Years: $" + d["MN_EARN_WNE_P10"]))
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px");
}

// hides tooltip when mouse leaves the
function mouseoutHandler() {
  div.transition()
    .duration(500)
    .style("opacity", 0);
}

// handles the data interpretation after loading the dataset
function ready(err, us, data) {
  if (err) {
    console.log(err);
  }
  
  dataset = data.map(function (d) {
    d["LONGITUDE"] = Number.parseFloat(d["LONGITUDE"]);
    d["LATITUDE"] = Number.parseFloat(d["LATITUDE"]);
    d["UG"] = Number.parseInt(d["UG"]) || Number.parseInt(d["UGDS"]) || 0;
    d["COSTT4_A"] = Number.parseFloat(d["COSTT4_A"]) || Number.parseFloat(d["COSTT4_P"]) || 0;
    d["MN_EARN_WNE_P10"] = Number.parseFloat(d["MN_EARN_WNE_P10"]) || 0;
    d["UNEMP_RATE"] = Number.parseFloat(d["UNEMP_RATE"]) || 1;
    return d;
  }).filter(function (d) {
    return validStates.indexOf(d["STABBR"]) !== -1 && !Number.isNaN(d["LONGITUDE"]) && !Number.isNaN(d["LATITUDE"]);
  });
  
  var ugMin = document.getElementById("ug-min")
    , ugMax = document.getElementById("ug-max")
    , earnMin = document.getElementById("earn-min")
    , earnMax = document.getElementById("earn-max")
    , costMin = document.getElementById("cost-min")
    , costMax = document.getElementById("cost-max");
  
  // set slider values
  // TODO: Fix slider display
  ugMin.min = d3.min(_.map(dataset, 'UG'));
  ugMin.max = d3.max(_.map(dataset, 'UG'));
  ugMin.value = ugMin.min;
  ugMax.min = ugMin.min;
  ugMax.max = ugMin.max;
  ugMax.value = ugMax.max;
  
  earnMin.min = d3.min(_.map(dataset, "MN_EARN_WNE_P10"));
  earnMin.max = d3.max(_.map(dataset, "MN_EARN_WNE_P10"));
  earnMin.value = earnMin.min;
  earnMax.min = earnMin.min;
  earnMax.max = earnMin.max;
  earnMax.value = earnMax.max;
  
  costMin.min = d3.min(_.map(dataset, 'COSTT4_A'));
  costMin.max = d3.max(_.map(dataset, 'COSTT4_A'));
  costMin.value = costMin.min;
  costMax.min = costMin.min;
  costMax.max = costMin.max;
  costMax.value = costMax.max;
  
  g.attr("class", "states")
    .attr("fill", "#CCC")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter()
    .append("path")
    .attr("d", path)
    .on("click", selected);
  
  g.append("path")
    .attr("class", "state-borders")
    .attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })));
  
  draw();
  scatterplot();
  
  $("#ug-min").on("change", filter);
  $("#ug-max").on("change", filter);
  $("#earn-min").on("change", filter);
  $("#earn-max").on("change", filter);
  $("#cost-min").on("change", filter);
  $("#cost-max").on("change", filter);
}
