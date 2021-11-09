// jshint ignore: start
/*global d3*/

// eslint-disable-next-line
function renderTree(outlet, treeData, viewerWidth, viewerHeight, events) {
  // Calculate total nodes, max label length
  var maxLabelLength = 0;
  // panning variables
  // Misc. variables
  var i = 0;
  var duration = 450;
  var root;

  var tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

  // define a d3 diagonal projection for use by the node paths later on.
  var diagonal = d3.svg.diagonal().projection(function(d) {
    return [d.y, d.x];
  });

  // A recursive helper function for performing some setup by walking through all nodes

  function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
      var count = children.length;
      for (var i = 0; i < count; i++) {
        visit(children[i], visitFn, childrenFn);
      }
    }
  }

  // Call visit function to establish maxLabelLength
  visit(
    treeData,
    function(d) {
      maxLabelLength = Math.max(d.name.length, maxLabelLength);
    },
    function(d) {
      return d.children && d.children.length > 0 ? d.children : null;
    }
  );

  // sort the tree according to the node names

  function sortTree() {
    tree.sort(function(a, b) {
      return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
    });
  }
  // Sort the tree initially incase the JSON isn't in a sorted order.
  sortTree();

  // Define the zoom function for the zoomable tree

  function zoom() {
    svgGroup.attr(
      "transform",
      "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
    );
  }

  // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
  var zoomListener = d3.behavior
    .zoom()
    .scaleExtent([0.25, 30])
    .on("zoom", zoom);

  // define the baseSvg, attaching a class for styling and the zoomListener
  var baseSvg = d3.select(outlet).append("svg");

  var svgDefs = baseSvg.append("svg:defs");
  // font
  svgDefs
    .append("style")
    .attr("type", "text/css")
    .text(
      `@import url('//fonts.googleapis.com/css2?family=Raleway:wght@200&display=swap');`
    );

  baseSvg
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay")
    .call(zoomListener);

  // Helper functions for collapsing and expanding nodes.

  function collapse(d) {
    // console.debug("collapse", d);
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function expand(d, level) {
    // console.debug("expand", d);
    if (d._children) {
      d.children = d._children;
      if (level) {
        d.children.forEach(expand);
      }
      d._children = null;
    }
  }

  // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
  let scale;
  let x, y;

  function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.y0;
    y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select("g")
      .transition()
      .duration(duration)
      .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
  }

  // Toggle children function

  function toggleChildren(parentNode, d) {
    let event = "";
    if (d.children) {
      event = "collapse";
      collapse(d);
    } else if (d._children) {
      event = "expand";
      expand(d, 0);
    }
    return { d, event };
  }

  function click(d) {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    const info = toggleChildren(this, d);
    update(info.d);
    centerNode(info.d);
    events.onNodeClicked(this, info.d);
    if (info.event === "expand") {
      events.onNodeExpanded(d, d.children || []);
    } else {
      events.onNodeCollapsed(d, d._children || []);
    }
  }

  function update(source) {
    let node;
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {
      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function(d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 100;
    tree = tree.size([newHeight, viewerWidth]);

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) {
      d.y = d.depth * (maxLabelLength * 4); //maxLabelLength * 10px
      // alternatively to keep a fixed scale one can set a fixed depth per level
      // Normalize for fixed-depth by commenting out below line
      // d.y = (d.depth * 500); //500px per level.
    });

    // Update the nodesÃ¢ÂÂ¦
    node = svgGroup.selectAll("g.node").data(nodes, function(d) {
      return d.id || (d.id = ++i);
    });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
      })
      .attr("data-id", function(d) {
        return d.id;
      })
      .on("click", click);

    nodeEnter
      .append("circle")
      .attr("class", "nodeCircle")
      .attr("r", 0)
      .style("fill", function(d) {
        return d._children ? "#27D8C3" : "#fff";
      })
      .attr("data-id", function(d) {
        return d.id;
      })
      .attr("data-example", function(d) {
        return d.example || "";
      });

    // #0E8E82
    // nnon clickced #27D8C3

    nodeEnter
      .append("text")
      .attr("x", function(d) {
        return 0;
      })
      .attr("dy", ".35em")
      .attr("class", "nodeText")
      .attr("text-anchor", function(d) {
        return "middle";
      })
      .text(function(d) {
        return d.name;
      })
      .style("fill-opacity", 0);

    // Update the text to reflect whether node has children or not.
    node
      .select("text")
      .attr("data-id", function(d) {
        return d.id;
      })
      .attr("x", function(d) {
        if (d.id === 1) {
          return 0;
        }
        return 0;
      })
      .attr("y", function(d) {
        if (d.id === 1) {
          return -8;
        }
        return d.depth % 2 === 0 ? -30 : +30;
      })
      .attr("text-anchor", function(d) {
        return "middle";
      })
      .attr("dy", ".35em")
      .attr("alignment-baseline", "middle")
      .style("fill", function(d) {
        if (d.id === 1) {
          return "#010305";
        }
        return "white";
      })
      .text(function(d) {
        // console.debug(d);
        return d.name;
      });

    // Change the circle fill depending on whether it has children and is collapsed
    node
      .select("circle.nodeCircle")
      .attr("r", function(d) {
        if (d.id === 1) {
          return 80;
        }
        return 18;
      })
      .style("fill", function(d) {
        return d._children ? "#27D8C3" : "#fff";
      });

    // Transition nodes to their new position.
    var nodeUpdate = node
      .transition()
      .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    // Fade the text in
    nodeUpdate.select("text").style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node
      .exit()
      .transition()
      .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select("circle").attr("r", 0);

    nodeExit.select("text").style("fill-opacity", 0);

    // Update the linksÃ¢ÂÂ¦
    var link = svgGroup.selectAll("path.link").data(links, function(d) {
      return d.target.id;
    });

    // Enter any new links at the parent's previous position.
    link
      .enter()
      .insert("path", "g")
      .attr("vector-effect", "non-scaling-stroke")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {
          x: source.x0,
          y: source.y0
        };
        return diagonal({
          source: o,
          target: o
        });
      });

    // Transition links to their new position.
    link
      .transition()
      .duration(duration)
      .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link
      .exit()
      .transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {
          x: source.x,
          y: source.y
        };
        return diagonal({
          source: o,
          target: o
        });
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Append a group which holds all nodes and which the zoom Listener can act upon.
  var svgGroup = baseSvg.append("g");

  // Define the root
  root = treeData;
  root.x0 = viewerHeight / 2;
  root.y0 = 0;

  // Collapse all children of roots children before rendering.
  root.children.forEach(function(child) {
    collapse(child);
  });

  collapse(root);

  // Layout the tree initially and center on the root node.
  update(root);
  centerNode(root);
}
