import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = [];
let projectsContainer;
let searchInput;

async function initProjects() {
  try {
    // Fetch and render projects list
    projects = await fetchJSON('../lib/projects.json');
    projectsContainer = document.querySelector('.projects');

    // Update title count
    const titleEl = document.querySelector('.projects-title');
    titleEl.textContent = `${projects.length} projects`;

    // Initial render
    renderProjects(projects, projectsContainer, 'h2');
    setupSearch();
    renderPieChart(projects);
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

function setupSearch() {
  searchInput = document.querySelector('.searchBar');
  let query = '';

  // On user input (real-time)
  searchInput.addEventListener('input', event => {
    query = event.target.value;
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
  // 1. Prepare data: count projects per year
  const rolled = d3.rollups(
    dataProjects,
    v => v.length,
    d => d.year
  );
  const data = rolled.map(([year, count]) => ({ value: count, label: year }));

  const svg = d3.select('#projects-pie-plot');
  const legendEl = d3.select('.legend');
  const radius = 50;

  // Clear old chart
  svg.selectAll('path').remove();
  legendEl.selectAll('li').remove();

  if (data.length === 0) {
    // No data to show
    return;
  }

  // 2. Arc and pie generators
  const arcGen = d3.arc().innerRadius(0).outerRadius(radius);
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(data);

  // 3. Color scale
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  // 4. Draw slices
  svg
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', (d, i) => color(i));

  // 5. Draw legend
  legendEl
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', (d, i) => `--color:${color(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

// Initialize on load or DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}