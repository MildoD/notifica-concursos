// eslint-disable-next-line import/extensions
import { getCareers, getExams } from "../modules/pci-concursos.js";

let careerFilter = () => {};

function insertPlaceSelect(table) {
  document
    .querySelector("#placeSelectCell")
    .insertAdjacentHTML(
      "beforeend",
      '<select id="placeSelect"><option value="" hidden>Local</option><option value=""></option></select>'
    );

  const placeSelect = document.querySelector("#placeSelect");

  table
    .api()
    .column("place:name")
    // eslint-disable-next-line func-names, array-callback-return
    .every(function () {
      const placeColumn = this;

      placeColumn
        .data()
        .unique()
        .sort()
        .each((value) => {
          placeSelect.insertAdjacentHTML(
            "beforeend",
            `<option value="${value}">${value}</option>`
          );
        });

      placeSelect.onchange = (event) => {
        // eslint-disable-next-line no-undef
        const value = $.fn.dataTable.util.escapeRegex(event.target.value);
        placeColumn.search(value ? `^${value}$` : "", true, false).draw();

        if (value === "") {
          placeSelect.selectedIndex = 0;
        }
      };
    });
}

async function insertCareerSelect(table) {
  document
    .querySelector("#careerSelectCell")
    .insertAdjacentHTML(
      "beforeend",
      '<select id="careerSelect"><option value="" hidden>Cargo</option><option value=""></option></select>'
    );

  const careerSelect = document.querySelector("#careerSelect");

  (await getCareers()).forEach((career) => {
    careerSelect.insertAdjacentHTML(
      "beforeend",
      `<option value="${career.url}">${career.name}</option>`
    );
  });

  careerSelect.onchange = async (event) => {
    careerSelect.disabled = true;

    // eslint-disable-next-line no-undef
    const careerFilterIndex = $.fn.dataTable.ext.search.indexOf(careerFilter);
    if (careerFilter !== -1) {
      // eslint-disable-next-line no-undef
      $.fn.dataTable.ext.search.splice(careerFilterIndex, 1);
    }

    const careerUrl = event.target.value;
    if (careerUrl !== "") {
      const careerExamsUrls = (await getExams(careerUrl)).map(
        (exam) => exam.url
      );
      careerFilter = (settings, searchData, index, rowData) =>
        careerExamsUrls.includes(rowData.url);
      // eslint-disable-next-line no-undef
      $.fn.dataTable.ext.search.push(careerFilter);
    }

    table.api().draw();

    careerSelect.disabled = false;

    if (careerUrl === "") {
      careerSelect.selectedIndex = 0;
    }
  };
}

chrome.storage.local.get().then(({ syncedExams }) => {
  document.querySelector("body").addEventListener("click", (e) => {
    if (e.target.matches("td > a")) {
      chrome.tabs.create({ url: e.target.href, active: false });
    }
  });

  // eslint-disable-next-line no-unused-vars, no-undef
  const examsTable = new DataTable("#examsTable", {
    data: syncedExams,
    columns: [
      {
        title: "Instituição",
        data: "institution",
        render: (_data, _type, row) => {
          return `<a href="${row.url}">${row.institution}</a>`;
        },
      },
      { title: "Local", data: "place", name: "place" },
      { title: "Vagas", data: "vacancies" },
      {
        title: "Atualização",
        data: "updatedAt",
        render: (data, type) =>
          type === "display" || type === "filter"
            ? new Date(data).toLocaleDateString()
            : data,
      },
    ],
    order: [
      [3, "desc"],
      [2, "desc"],
      [1, "asc"],
      [0, "asc"],
    ],
    columnDefs: [{ className: "text-center", targets: [1, 2, 3] }],
    dom:
      "<'#filters.row grid-x'<'#placeSelectCell.small-4 columns cell'><'#careerSelectCell.small-4 columns cell'><'small-4 columns cell'f>r>" +
      "t" +
      "<'row grid-x'<'small-5 columns cell'><'small-7 columns cell'p>>",
    language: { url: "../libs/datatables/1.13.2/misc/pt-BR.json" },
    initComplete() {
      insertPlaceSelect(this);
      insertCareerSelect(this);
    },
  });

  chrome.storage.local.set({
    syncedExams: syncedExams.map((syncedExam) => {
      return { ...syncedExam, visualized: true };
    }),
  });
});

chrome.action.setTitle({ title: "Notifica Concursos" });
