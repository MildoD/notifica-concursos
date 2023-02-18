/* eslint-disable import/extensions */
import { DOMParser } from "../libs/linkedom/0.14.22/js/linkedom-0.14.22.js";

async function getHtml(url) {
  return new Promise((resolve) => {
    fetch(url).then((response) => {
      response.text().then((htmlText) => {
        const parser = new DOMParser();

        resolve(parser.parseFromString(htmlText, "text/html"));
      });
    });
  });
}

function getPlace(exam) {
  let element = exam.querySelector(".cc");

  if (element.textContent === "\xA0" || element.textContent === "&nbsp;") {
    element = element.parentElement.parentElement;

    while (element.className !== "ua") {
      element = element.previousElementSibling;
    }

    return element.querySelector(".uf").textContent.replace("REGIÃO ", "");
  }
  return element.textContent;
}

function getExamsData(html) {
  const exams = html.querySelectorAll(".fa > .ca, .na > .ca");

  return Array.from(exams, (exam) => {
    return {
      institution: exam.querySelector("a").textContent,
      url: exam.querySelector("a").href,
      place: getPlace(exam),
      vacancies: (() => {
        const match = exam
          .querySelector(".cd")
          .firstChild.textContent.match(/(\d+)(?=\s*vaga)/);
        return match ? parseInt(match[0], 10) : "-";
      })(),
    };
  });
}

async function getExams(url) {
  const html = await getHtml(url);

  return getExamsData(html);
}

async function getAllExams() {
  const urls = [
    "https://www.pciconcursos.com.br/concursos/nacional/",
    "https://www.pciconcursos.com.br/concursos/sudeste/",
    "https://www.pciconcursos.com.br/concursos/sul/",
    "https://www.pciconcursos.com.br/concursos/centrooeste/",
    "https://www.pciconcursos.com.br/concursos/norte/",
    "https://www.pciconcursos.com.br/concursos/nordeste/",
  ];

  const allExams = [];
  const updatedAt = Date.now();

  await Promise.all(
    urls.map(async (url) => {
      const exams = (await getExams(url, updatedAt)).map((exam) => {
        // eslint-disable-next-line no-param-reassign
        exam.updatedAt = updatedAt;
        return exam;
      });
      allExams.push(...exams);
    })
  );

  return allExams;
}

function getCareersData(html) {
  const careers = html.querySelectorAll(".linkb > li > a");

  return Array.from(careers, (career) => ({
    name: career.textContent.substring(career.textContent.indexOf(" ") + 1),
    url: career.href,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

async function getCareers() {
  const url = "https://www.pciconcursos.com.br/vagas/";

  const careers = [];

  await getHtml(url).then((html) => careers.push(...getCareersData(html)));

  return careers;
}

export { getAllExams, getCareers, getExams };
