(() => {
  const form = document.getElementById("publication-filters");
  if (!form) return;
  const rows = [...document.querySelectorAll("#publication-list .publication-row")];
  const groups = [...document.querySelectorAll("#publication-list .publication-group")];
  const search = document.getElementById("publication-search");
  const year = document.getElementById("publication-year");
  const topic = document.getElementById("publication-topic");
  const featured = document.getElementById("publication-featured");
  const normalize = (str) =>
    str
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase();
  const update = () => {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    rows.forEach((row) => {
      const text = normalize(row.dataset.search);
      const visible =
        terms.every((term) => text.includes(term)) &&
        (!year.value || row.dataset.year === year.value) &&
        (!topic.value || row.dataset.topics.split("|").includes(topic.value)) &&
        (!featured.checked || row.dataset.featured === "true");
      row.hidden = !visible;
      if (visible) count++;
    });
    groups.forEach((group) => {
      group.hidden = ![...group.querySelectorAll(".publication-row")].some((row) => !row.hidden);
    });
    document.getElementById("publication-count").textContent =
      `${count} publication${count === 1 ? "" : "s"}`;
    document.getElementById("no-results").hidden = count > 0;
  };
  form.hidden = false;
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("reset", () => setTimeout(update, 0));
})();
