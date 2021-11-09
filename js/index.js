// jshint ignore: start
/*global $, _, decodeBudget, device, numeral, block, unblock, fetchDataset, renderTree*/
const RESULT_DETAILS_TEMPLATE = `
<table class="table table-striped table-borderless table-sm">
  <% columns.map((column) => { %>
  <tr>
    <td><%- column %></td>
    <td><%= format(row, column) %></td>
  </tr>
  <% }) %>
</table>
`;

const setupTooltips = (node) => {
  $(node).tooltipster({
    contentAsHTML: true,
    plugins: ["follower"],
    animation: "fade",
    delay: 0,
    // trigger: "click",
    functionInit: function (instance, helper) {
      const example = helper.origin.getAttribute("data-example");
      instance.content(example);
    }
  });
};
const outlet = "#AppDiagram";

const buildGraph = (context) => {
  const $result = $(".AppContentResult");
  const renderRow = (columns, row) =>
    _.template(RESULT_DETAILS_TEMPLATE)({
      row,
      columns,
      format: (row, column) => {
        const value = row[column];
        if (!value) {
          return "- n/a -";
        }
        if (column === "Website") {
          console.debug(value);
          return `
            <i class="fa fa-external-link" aria-hidden="true"></i> &nbsp;
            <a href="${value}" target="_blank">
              Link
            </a>
          `;
        } else if (column === "Budget") {
          return numeral(decodeBudget(value)).format("$ 0,0.00 a");
        }
        return value;
      }
    });
  const treeData = context.tree;
  const viewerWidth = $(window).width();
  const viewerHeight =
    $(window).height() -
    $(".AppHeader").height() -
    $(".AppFooter").height() -
    16;
  // console.debug(JSON.stringify(treeData, null, 2));
  renderTree(outlet, treeData, viewerWidth, viewerHeight, {
    onNodeExpanded: (node, children) => {
      children.forEach((c) => {
        if (c.column === "Need") {
          const circle = $(`circle[data-id="${c.id}"]`);
          setupTooltips(circle);
        }
      });
    },
    onNodeCollapsed: (node, children) => {
      children.forEach((c) => {
        if (c.column === "Need") {
          console.debug("Tooltip destroy", c);
        }
      });
    },
    onNodeClicked: (svg, data) => {
      if (data.row) {
        const columns = [
          "Sector focus",
          "Budget",
          "Management",
          "Type of support",
          "Description",
          "Eligibility",
          "Access modality",
          "Website"
        ];
        $result.find(".title").empty().text(data.row.Instrument);
        $result.find(".content").empty().append(renderRow(columns, data.row));
        $result.parent().css("display", "block");
      } else {
        $result.parent().css("display", "none");
      }
    }
  });
  setupTooltips();
};

const setInfoPanelDisplay = (current) => {
  $(".toggleIntro").css("display", "block");
  if (current === "block") {
    $(".toggleIntro").css({ left: "auto", right: "10px" });
    $(".AppContentIntroPane").removeClass("contracted").addClass("expanded");
  } else {
    $(".toggleIntro").css({ left: "2px", right: "auto" });
    $(".AppContentIntroPane").removeClass("expanded").addClass("contracted");
  }
  $(".toggleIntro > button").html(current === "block" ? "&laquo;" : "&raquo;");
  const nextDisplay = current === "block" ? "block" : "none";
  $(".AppContentIntro").css("display", nextDisplay);
  localStorage.setItem("help.display", nextDisplay);
};

$(document).ready(() => {
  // eslint-disable-next-line
  // setupConsent();
  block();
  if (device.mobile()) {
    $("body").addClass("mobile");
  }
  // restore display of navigation help
  const prefferedDisplay = localStorage.getItem("help.display");
  setInfoPanelDisplay(prefferedDisplay || "block");
  $(".toggleIntro > button")
    .off("click")
    .on("click", () => {
      const current = localStorage.getItem("help.display");
      setInfoPanelDisplay(current === "none" ? "block" : "none");
    });
  // toggle result detail on click
  $(".toggleResult > button")
    .off("click")
    .on("click", () => {
      $(".AppContentResultPane").css("display", "none");
    });
  fetchDataset()
    .then((context) => buildGraph(context))
    .then(() => unblock());
  $(window).on("resize", () => {
    console.debug("on resize");
    const viewerWidth = $(window).width();
    const viewerHeight =
      $(window).height() -
      $(".AppHeader").height() -
      $(".AppFooter").height() -
      16;
    $(outlet)
      .find("svg")
      .attr("width", viewerWidth)
      .attr("height", viewerHeight);
  });
});
