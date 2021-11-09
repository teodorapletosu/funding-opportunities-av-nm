// jshint ignore: start
/*global XLSX*/

const DATABASE_ID = "1kMgUbL5TjtutLGH87uMsKoUwDRsICViaeNjFbGjREbM";
// eslint-disable-next-line
const fetchDataset = () => {
  const context = {
    sheets: {},
    dataProviders: {},
    merges: {}
  };
  const fetchDatabase = () => {
    const fileId = encodeURIComponent(DATABASE_ID);
    const fileFormat = "xlsx";
    // const fileUrl = `//us-central1-plasma-card-258813.cloudfunctions.net/proxy-sheet?id=${encodeURIComponent(
    //   fileId
    // )}`;
    const fileUrl = "dataset/database.xlsx";
    const decoders = {
      xlsx: re => {
        return re.arrayBuffer().then(arrayBuffer => {
          const data = new Uint8Array(arrayBuffer);
          const arr = [];
          for (let i = 0; i !== data.length; ++i) {
            arr[i] = String.fromCharCode(data[i]);
          }
          const bstr = arr.join("");
          const workbook = XLSX.read(bstr, { type: "binary" });
          const decodeSheet = sheetName => {
            // Records
            const currentSheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_row_object_array(currentSheet);
            const extractHeaders = ws => {
              const header = [];
              const sheetRows = XLSX.utils.sheet_to_row_object_array(ws);
              const columnDesc = XLSX.utils.decode_range(ws["!ref"]);
              const columnCount = sheetRows.length ? Object.keys(sheetRows[0]).length : columnDesc.e.c + 1;
              for (let i = 0; i < columnCount; ++i) {
                const cellIndex = `${XLSX.utils.encode_col(i)}1`;
                const cell = ws[cellIndex];
                header[i] = cell.v;
              }
              return header;
            };
            const headers = extractHeaders(currentSheet);
            const extractMerges = ws => {
              const mergeInfo = ws["!merges"] || [];
              // console.debug(">> currentSheet", sheetName, mergeInfo);
              // CAVEAT: Horizontal merges should not be used
              const merges = mergeInfo.reduce((merges, merge) => {
                const rangeStartColumn = headers[merge.s.c];
                const rangeStartRow = merge.s.r;
                // const rangeEndColumn = headers[merge.e.c];
                const rangeEndRow = merge.e.r;
                // console.debug("Merge", merge, { rangeStartRow, rangeEndRow });
                for (let r = rangeStartRow; r <= rangeEndRow; r++) {
                  const rowIndex = r - 1;
                  const mergeValue = rows[rangeStartRow - 1][rangeStartColumn];
                  if (typeof merges[rowIndex] === "undefined") {
                    merges[rowIndex] = {};
                  }
                  merges[rowIndex][rangeStartColumn] = mergeValue;
                }
                return merges;
              }, {});
              return merges;
            };
            const merges = extractMerges(currentSheet);
            // Encodings and dictionaries
            // console.debug(workbook);
            if (workbook.SheetNames.length) {
              const headers = Object.keys(rows[0]);
              headers.forEach(header => {
                const indexOfSheet = workbook.SheetNames.indexOf(header);
                if (indexOfSheet !== -1) {
                  const headerSheet = workbook.Sheets[header];
                  const rows = XLSX.utils.sheet_to_row_object_array(
                    headerSheet
                  );
                  context.dataProviders[header] = rows;
                }
              });
              context.dataProviders.Example = XLSX.utils.sheet_to_row_object_array(
                workbook.Sheets["Example"]
              );
            }
            return { headers, rows, merges };
          };
          return {
            Database: decodeSheet("Database")
          };
        });
      }
    };
    return fetch(fileUrl).then(re => {
      if (re.ok) {
        return decoders[fileFormat](re);
      }
      console.error("Error while fetching document", re);
      throw new Error("Cannot decode document");
    });
  };
  return fetchDatabase().then(sheets => {
    context.sheets = sheets;
    // create tree
    context.tree = {
      // level: null,
      name: "Who are you ?",
      children: []
    };
    //
    const parents = [
      "Operator",
      "Sector",
      "Need",
      "EU funding programme",
      "Instrument"
    ];
    const buildNode = (level, row, parentNode) => {
      const columnName = parents[level];
      const cellValue = row[columnName];
      let existing = parentNode.children.find(node => node.name === cellValue);
      if (!existing) {
        existing = {
          // level: level,
          name: cellValue,
          column: columnName,
          children: []
        };
        if (columnName === "Need") {
          // console.debug(row);
          const example = (context.dataProviders.Example || []).find(
            example =>
              example.Need === cellValue && example.Sector === parentNode.name
          );
          existing.example = example ? example.Example || "- n/a -" : "- n/s -";
          if (existing.example === "- n/s -") {
            console.error("No example set for", {
              Need: cellValue,
              Sector: parentNode.name
            });
          }
          // existing.example = row.Example;
        }
        parentNode.children.push(existing);
      }
      if (level < parents.length - 1) {
        buildNode(level + 1, row, existing);
      } else {
        existing.row = row;
      }
    };
    sheets.Database.rows.forEach(row => {
      buildNode(0, row, context.tree);
    });
    return context;
  });
};
