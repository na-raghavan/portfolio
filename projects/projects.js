import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function initProjects() {
  try {
    const projects = await fetchJSON('../lib/projects.json');

    const projectsTitleElem = document.querySelector('.projects-title');
    if (projectsTitleElem) {
      projectsTitleElem.textContent = `${projects.length} projects`;
    }

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Could not find .projects container in the DOM');
      return;
    }
    renderProjects(projects, projectsContainer, 'h2');

    const rolledData = d3.rollups(
      projects,
      v => v.length,
      d => d.year
    );
    const data = rolledData.map(([year, count]) => ({ value: count, label: year }));

    drawPieChart(data);
  } catch (error) {
    console.error('Error loading or rendering projects:', error);
  }
}

function drawPieChart(data) {
  const svg = d3.select('#projects-pie-plot');
  const radius = 50;

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const pieGenerator = d3.pie().value(d => d.value);
  const arcData = pieGenerator(data);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg
    .selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', arcGenerator)
    .attr('fill', (d, i) => color(i));

  const legend = d3.select('.legend');
  legend.selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', (d, i) => `--color:${color(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}