// jshint ignore: start
/*global d3*/

// eslint-disable-next-line
function renderTree(outlet, treeData, viewerWidth, viewerHeight, events) {
  // Calculate total nodes, max label length
  var maxLabelLength = 0;
  // variables for drag/drop
  var draggingNode = null;
  // panning variables
  var panSpeed = 200;
  // Misc. variables
  var i = 0;
  var duration = 750;
  var root = d3.hierarchy(treeData, function(d) {
    return d.children;
  });

  var treemap;
  //var tree = d3.tree().size([viewerHeight, viewerWidth]);

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
    //tree.sort(function(a, b) {
    //    return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
    //});
  }
  // Sort the tree initially incase the JSON isn't in a sorted order.
  sortTree();
  // TODO: Pan function, can be better implemented.

  // Define the zoom function for the zoomable tree
  function zoom() {
    if (d3.event.transform != null) {
      svgGroup.attr("transform", d3.event.transform);
    }
  }

  var t, x, y;

  function centerNode(source) {
    t = d3.zoomTransform(baseSvg.node());
    x = -source.y0;
    y = -source.x0;
    x = x * t.k + viewerWidth / 2;
    y = y * t.k + viewerHeight / 2;
    d3.select("svg")
      .transition()
      .duration(duration)
      .call(zoomListener.transform, d3.zoomIdentity.translate(x, y).scale(t.k));
  }
  // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
  var zoomListener = d3
    .zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", zoom);

  // define the baseSvg, attaching a class for styling and the zoomListener
  var baseSvg = d3
    .select(outlet)
    .append("svg")
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay");

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function expand(d) {
    if (d._children) {
      d.children = d._children;
      d.children.forEach(expand);
      d._children = null;
    }
  }

  // Toggle children function

  function toggleChildren(d) {
    let event = "";
    if (d.children) {
      event = "collapse";
      collapse(d);
    } else if (d._children) {
      event = "expand";
      expand(d);
    }
    return { d, event };
  }

  // Toggle children on click.

  function click(d) {
    if (d3.event.defaultPrevented) return; // click suppressed
    d3.event.stopPropagation();
    d3.event.preventDefault();
    const info = toggleChildren(d);
    update(d);
    centerNode(info.d);
    events.onNodeClicked(this, info.d);
    if (info.event === "expand") {
      events.onNodeExpanded(d, d.children || []);
    } else {
      events.onNodeCollapsed(d, d._children || []);
    }
  }

  // Erzeugen geschwungene Linie vom Eltern- zum Kind-Knoten
  function diagonal(s, d) {
    /* The original from d3noob is not working in IE11!
			//https://bl.ocks.org/d3noob
			path = `M ${s.y} ${s.x}
					C ${(s.y + d.y) / 2} ${s.x},
					${(s.y + d.y) / 2} ${d.x},
					${d.y} ${d.x}`
			*/
    if (s != null && d != null) {
      var path =
        "M " +
        s.y +
        " " +
        s.x +
        " C " +
        (s.y + d.y) / 2 +
        " " +
        s.x +
        "," +
        (s.y + d.y) / 2 +
        " " +
        d.x +
        "," +
        " " +
        d.y +
        " " +
        d.x;

      return path;
    }
  }

  function update(source) {
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
    var newHeight = d3.max(levelWidth) * 90; // 25 pixels per line
    // Baum-Layout erzeugen und die GrÃ¶Ãen zuweisen
    treemap = d3.tree().size([newHeight, viewerWidth]);
    // Berechnung x- und y-Positionen pro Knoten
    var treeData = treemap(root);
    // Compute the new tree layout.
    var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) {
      d.y = d.depth * (maxLabelLength * 3); //maxLabelLength * 10px
      // alternatively to keep a fixed scale one can set a fixed depth per level
      // Normalize for fixed-depth by commenting out below line
      // d.y = (d.depth * 500); //500px per level.
    });
    // Update the nodesâ¦
    let node = svgGroup.selectAll("g.node").data(nodes, function(d) {
      return d.id || (d.id = ++i);
    });
    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node
      .enter()
      .append("g") //.call(dragListener)
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
      })
      .on("click", click);
    nodeEnter
      .append("circle")
      .attr("class", "nodeCircle")
      //.attr("r", 0)
      .attr("r", 4.5)
      .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#fff";
      });
    nodeEnter
      .append("text")
      .attr("x", function(d) {
        return d.children || d._children ? -10 : 10;
      })
      .attr("dy", ".35em")
      .attr("class", "nodeText")
      .attr("text-anchor", function(d) {
        return d.children || d._children ? "end" : "start";
      })
      .text(function(d) {
        return d.data.name;
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
        return d.children || d._children ? -20 : 20;
      })
      .attr("y", function(d) {
        if (d.id === 1) {
          return -8;
        }
        return -20;
      })
      .attr("text-anchor", function(d) {
        if (d.id === 1) {
          return "middle";
        }
        return d.children || d._children ? "end" : "start";
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
      .select("circle.nodeCircle")
      .attr("r", function(d) {
        if (d.id === 1) {
          return 80;
        }
        return 18;
      })
      .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#fff";
      });
    // Transition nodes to their new position.
    var nodeUpdate = nodeEnter.merge(node);
    nodeUpdate
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
    // Update the linksâ¦
    var link = svgGroup.selectAll("path.link").data(links, function(d) {
      return d.id;
    });
    // Enter any new links at the parent's previous position.
    var linkEnter = link
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = { x: source.x0, y: source.y0 };
        return diagonal(o, o);
      });
    // Transition links to their new position.
    var linkUpdate = linkEnter.merge(link);
    linkUpdate
      .transition()
      .duration(duration)
      .attr("d", function(d) {
        return diagonal(d, d.parent);
      });
    // Transition exiting nodes to the parent's new position.
    var linkExit = link
      .exit()
      .transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = { x: source.x, y: source.y };
        return diagonal(o, o);
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
  //root = treeData;
  //root = d3.hierarchy(treeData, function(d) { return d.children; });
  root.x0 = viewerHeight / 2;
  root.x0 = 200;
  root.y0 = 50;

  // Collapse all children of roots children before rendering.
  root.children.forEach(function(child) {
    collapse(child);
  });

  collapse(root);

  // Layout the tree initially and center on the root node.
  update(root);
  centerNode(root);
}
