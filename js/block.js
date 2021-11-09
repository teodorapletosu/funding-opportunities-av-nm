// jshint ignore: start
/*global $*/

// Blocker (progress indicator)

$.blockUI.defaults.css.border = "none";
$.blockUI.defaults.css.backgroundColor = "rgba(0,0,0,0.0);";
$.blockUI.defaults.css.border = "none";
$.blockUI.defaults.overlayCSS.opacity = 0.1;

const block = () => {
  $.blockUI({
    // message: '<div class="loadingIndicator"><img src="img/busy.gif" width="64" /></div>'
    message: `
    <div class="loadingIndicator">
      <div class="lds-ellipsis">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    `
  });
};

const unblock = () => {
  $.unblockUI();
  $(".AppContainer").css("visibility", "visible");
};
