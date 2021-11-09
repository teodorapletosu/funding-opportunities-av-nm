// jshint ignore: start
/*global _, accounting, numeral*/

// load a locale
numeral.register("locale", "en-custom", {
  delimiters: {
    thousands: " ",
    decimal: ","
  },
  abbreviations: {
    thousand: "thousand",
    million: "million",
    billion: "billion",
    trillion: "trillion"
  },
  ordinal: function (number) {
    return number === 1 ? "st" : "nd";
  },
  currency: {
    symbol: "&euro;"
  }
});
numeral.locale("en-custom");

let context = {
  dataSet: {},
  dataProviders: {}
};

const decodeBudget = (input) => {
  let decodedBudgetValue = 0;
  const rawBudged = input;
  if (rawBudged) {
    const decodedBudget = accounting.unformat(rawBudged, ",");
    decodedBudgetValue = numeral(decodedBudget).value();
  }
  console.debug(">> decoded budget", decodedBudgetValue, input);
  return decodedBudgetValue;
};

// eslint-disable-next-line
const setupContext = (ctx) => {
  context = _.merge({}, context, ctx);
  context.countriesMap = _.reduce(
    context.dataSet.countries,
    (acc, it) => {
      acc[it.name] = it;
      return acc;
    },
    {}
  );
  context.rows = context.dataSet.sheets.Database.rows;
  context.merges = context.dataSet.sheets.Database.merges;
  return context;
};

// eslint-disable-next-line
const setupPlugins = () => {};

// eslint-disable-next-line
const setupConsent = () => {
  window.cookieconsent.initialise({
    type: "opt-in",
    content: {
      header: "Cookies",
      message:
        "This site uses cookies to offer you a better browsing experience. Find out more on",
      dismiss: "Got it!",
      allow: "I accept cookies",
      deny: "I refuse cookies",
      link: "how we use cookies and how you can change your settings.",
      href: "https://www.cookiesandyou.com",
      close: "&#x274c;",
      policy: "Cookie Policy",
      target: "_blank"
    },
    container: document.getElementById("content"),
    palette: {
      popup: { background: "#134f9f", border: "#fff" },
      button: { background: "#134f9f", border: "#fff" }
    },
    revokable: true,
    onStatusChange: function (status) {
      console.log(this.hasConsented() ? "enable cookies" : "disable cookies");
    },
    law: {
      regionalLaw: true
    },
    location: true
  });
};
