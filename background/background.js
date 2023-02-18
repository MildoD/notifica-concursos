/* eslint-disable import/extensions */
import { getAllExams } from "../modules/pci-concursos.js";

function getNotOutdatedSyncedExams(syncedExams, exams) {
  return syncedExams.filter((syncedExam) =>
    exams.some(
      (exam) =>
        syncedExam.institution === exam.institution &&
        syncedExam.url === exam.url &&
        syncedExam.place === exam.place &&
        syncedExam.vacancies === exam.vacancies
    )
  );
}

function getNewExams(notOutdatedSyncedExams, exams) {
  return exams.filter(
    (exam) =>
      !notOutdatedSyncedExams.some(
        (notOutdatedSyncedExam) =>
          notOutdatedSyncedExam.institution === exam.institution &&
          notOutdatedSyncedExam.url === exam.url &&
          notOutdatedSyncedExam.place === exam.place &&
          notOutdatedSyncedExam.vacancies === exam.vacancies
      )
  );
}

function getExamsSortedByVacancies(exams) {
  return [
    ...new Set(
      exams
        .sort(
          (a, b) =>
            (b.vacancies !== "-" ? b.vacancies : 0) -
            (a.vacancies !== "-" ? a.vacancies : 0)
        )
        .map((exam) => exam.institution)
    ),
  ];
}

function showNotification(newExams) {
  chrome.notifications.clear("new-exams");

  chrome.notifications.create("new-exams", {
    type: "basic",
    title: `${newExams.length} concursos foram atualizados agora`,
    message: getExamsSortedByVacancies(newExams).join("\n").substring(0, 148),
    iconUrl: "../images/icons/notification.png",
  });
}

async function syncExams() {
  return chrome.storage.local.get().then(async ({ syncedExams }) => {
    const exams = (await getAllExams()).map((exam) => {
      return { ...exam, visualized: false };
    });

    const notOutdatedSyncedExams = getNotOutdatedSyncedExams(
      syncedExams,
      exams
    );
    const newExams = getNewExams(notOutdatedSyncedExams, exams);

    chrome.storage.local
      .set({
        syncedExams: notOutdatedSyncedExams.concat(newExams),
      })
      .then(() => {
        if (newExams.length > 0) {
          showNotification(newExams);
        }
      });
  });
}

async function updateAction() {
  return chrome.storage.local.get().then(({ syncedExams }) => {
    const updatedExamsCount = syncedExams.filter(
      (syncedExam) => syncedExam.visualized === false
    ).length;

    if (updatedExamsCount > 0) {
      chrome.action.setTitle({
        title: `${updatedExamsCount} concursos foram atualizados e não visualizados`,
      });
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({ syncedExams: [] });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncExams") {
    syncExams().then(() => {
      updateAction();
    });
  }
});

chrome.alarms.create("syncExams", { when: Date.now(), periodInMinutes: 60 });
