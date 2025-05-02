import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = [];
let projectsContainer;
let searchInput;
let selectedIndex = -1; 

async function initProjects() {
  try {
    projects = await fetchJSON('../lib/projects.json');
    projectsContainer = document.querySelector('.projects');

    const titleEl = document.querySelector('.projects-title');
    titleEl.textContent = `${projects.length} projects`;

    renderProjects(projects, projectsContainer, 'h2');
    setupSearch();
    renderPieChart(projects);
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

function setupSearch() {
  searchInput = document.querySelector('.searchBar');

  searchInput.addEventListener('input', event => {
    const query = event.target.value;
    const filtered = filterProjects(query);
    renderProjects(filtered, projectsContainer, 'h2');
    renderPieChart(filtered);
  });
}

function filterProjects(query) {
  const q = query.toLowerCase();
  return projects.filter(proj => {
    const combined = Object.values(proj).join(' ').toLowerCase();
    return combined.includes(q);
  });
}

function renderPieChart(dataProjects) {
  const rolled = d3.rollups(
    dataProjects,
    v => v.length,
    d => d.year
  );
  const data = rolled.map(([year, count]) => ({ value: count, label: year }));

  const svg = d3.select('#projects-pie-plot');
  const legendEl = d3.select('.legend');
  const radius = 50;

  svg.selectAll('path').remove();
  legendEl.selectAll('li').remove();

  if (data.length === 0) return; 
  const arcGen = d3.arc().innerRadius(0).outerRadius(radius);
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(data);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', (d, i) => color(i))
    .attr('class', (_, i) => i === selectedIndex ? 'selected' : '')
    .on('click', (event, d, i) => {
      selectedIndex = selectedIndex === i ? -1 : i;

      svg.selectAll('path')
        .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
      legendEl.selectAll('li')
        .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        const year = data[selectedIndex].label;
        const filtered = projects.filter(p => p.year === year);
        renderProjects(filtered, projectsContainer, 'h2');
      }
    });

  legendEl
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', (d, i) => `--color:${color(i)}`)
    .attr('class', (_, i) => i === selectedIndex ? 'selected' : '')
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (event, d, i) => {
      svg.selectAll('path').filter((_, idx) => idx === i).dispatch('click');
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}