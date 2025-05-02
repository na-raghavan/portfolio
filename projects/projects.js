import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = []; 
let searchQuery = ''; 
let selectedYear = null; 

let projectsContainer;
let searchInput;
let projectsTitleEl;
let svg; 
let legendEl; 

async function initProjects() {
  try {
    projects = await fetchJSON('../lib/projects.json');

    projectsContainer = document.querySelector('.projects');
    searchInput = document.querySelector('.searchBar');
    projectsTitleEl = document.querySelector('.projects-title');
    svg = d3.select('#projects-pie-plot'); 
    legendEl = d3.select('.legend'); 
    setupSearch();
    filterAndRender(); 
  } catch (err) {
    console.error('Error loading projects:', err);
    if (projectsContainer) {
       projectsContainer.innerHTML = '<p>Error loading projects. Please try again later.</p>';
    }
  }
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener('input', event => {
    searchQuery = event.target.value.toLowerCase();
    selectedYear = null; 
    filterAndRender();
  });
}

function filterProjects(query, projectsList) {
  const q = query.toLowerCase();
  return projectsList.filter(proj => {
    const combined = Object.values(proj).join(' ').toLowerCase();
    return combined.includes(q);
  });
}

function filterAndRender() {
  const filteredBySearch = filterProjects(searchQuery, projects);

  const finalFilteredList = selectedYear
    ? filteredBySearch.filter(p => p.year === selectedYear)
    : filteredBySearch;

  if (projectsTitleEl) {
    projectsTitleEl.textContent = `${finalFilteredList.length} projects`;
  }

  if (projectsContainer) {
    renderProjects(finalFilteredList, projectsContainer, 'h2');
  }


  renderPieChart(filteredBySearch);
}


function renderPieChart(dataToChart) {
  if (!svg || !legendEl) return;

  const rolled = d3.rollups(
    dataToChart,
    v => v.length,
    d => d.year
  );
  const data = rolled
    .map(([year, count]) => ({ value: count, label: year }))
    .sort((a, b) => a.label - b.label); 

  const radius = 50;
  const arcGen = d3.arc().innerRadius(0).outerRadius(radius);
  const pieGen = d3.pie().value(d => d.value).sort(null); 

  const arcs = pieGen(data);

  const yearLabels = Array.from(new Set(projects.map(p => p.year))).sort((a, b) => a - b);
  const color = d3.scaleOrdinal()
    .domain(yearLabels) 
    .range(d3.schemeTableau10);


  svg.selectAll('path').remove(); 

  if (data.length === 0) {
      legendEl.selectAll('li').remove();
      return;
  }

  svg
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => color(d.data.label))
    .attr('class', d => d.data.label === selectedYear ? 'selected' : '')
    .on('click', (event, d) => {
      const clickedYear = d.data.label; 

      selectedYear = selectedYear === clickedYear ? null : clickedYear;

      filterAndRender();
    });


  legendEl.selectAll('li').remove(); 

  legendEl
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('style', d => `--color:${color(d.label)}`)
    .attr('class', d => d.label === selectedYear ? 'selected' : '')
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (event, d) => {
       const clickedYear = d.label; 

       selectedYear = selectedYear === clickedYear ? null : clickedYear;

       filterAndRender();
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}