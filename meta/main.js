// meta/main.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  const commits = d3.groups(data, d => d.commit).map(([id, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const totalLines = lines.length;
    const hourFrac = datetime.getHours() + datetime.getMinutes() / 60;
    const url = `https://github.com/na-raghavan/portfolio/${id}`;

    const ret = { id, author, date, time, timezone, datetime, hourFrac, totalLines, url };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
      writable: false,
      configurable: false
    });
    return ret;
  });
  return commits.sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function computeStats(data, commits) {
  const totalLOC = data.length;
  const totalCommits = commits.length;
  const files = d3.groups(data, d => d.file);
  const fileCount = files.length;
  const fileLengths = files.map(([file, rows]) => d3.max(rows, d => d.line));
  const maxFileLength = d3.max(fileLengths);
  const longestFile = files.find(([, rows]) =>
    d3.max(rows, d => d.line) === maxFileLength
  )[0];
  const avgFileLength = d3.mean(fileLengths).toFixed(1);
  const avgLineLength = d3.mean(data, d => d.length).toFixed(1);
  const maxLineLength = d3.max(data, d => d.length);
  const longestLine = data.find(d => d.length === maxLineLength);
  const longestLineDesc = `File: ${longestLine.file}, line ${longestLine.line}`;

  const avgDepth = d3.mean(data, d => d.depth).toFixed(1);
  const maxDepth = d3.max(data, d => d.depth);
  const deepestLine = data.find(d => d.depth === maxDepth);
  const deepestLineDesc = `File: ${deepestLine.file}, line ${deepestLine.line}`;

  const avgFileDepth = d3.mean(
    files.map(([, rows]) => d3.mean(rows, d => d.depth))
  ).toFixed(1);

  const periodOfDay = d => {
    const h = d.datetime.getHours();
    if (h < 6) return 'Night';
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  };
  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    periodOfDay
  );
  const busiestPeriod = d3.greatest(workByPeriod, v => v[1])[0];

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const workByDay = d3.rollups(
    data,
    v => v.length,
    d => dayNames[d.datetime.getDay()]
  );
  const busiestDay = d3.greatest(workByDay, v => v[1])[0];

  return [
    { label: 'Total LOC', value: totalLOC },
    { label: 'Total commits', value: totalCommits },
    { label: 'Number of files', value: fileCount },
    { label: 'Longest file (lines)', value: `${longestFile} (${maxFileLength})` },
    { label: 'Average file length', value: avgFileLength },
    { label: 'Average line length', value: avgLineLength },
    { label: 'Longest line', value: longestLineDesc },
    { label: 'Average depth', value: avgDepth },
    { label: 'Deepest line', value: deepestLineDesc },
    { label: 'Average file depth', value: avgFileDepth },
    { label: 'Busiest time of day', value: busiestPeriod },
    { label: 'Busiest day of week', value: busiestDay },
  ];
}

function renderStats(stats) {
  const container = d3.select('#stats');
  const table = container.append('table').attr('class', 'stats-table');
  const thead = table.append('thead');
  thead.append('tr')
    .selectAll('th')
    .data(['Stat', 'Value'])
    .join('th')
    .text(d => d);

  const tbody = table.append('tbody');
  const rows = tbody.selectAll('tr')
    .data(stats)
    .join('tr');

  rows.append('td').text(d => d.label);
  rows.append('td').text(d => d.value);
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href        = commit.url;
  document.getElementById('commit-link').textContent = commit.id.substring(0, 7);
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
  document.getElementById('commit-time').textContent = commit.datetime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent  = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top  = `${event.clientY + 10}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection || !xScale || !yScale) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter(d => isCommitSelected(selection, d))
    : [];
  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = renderSelectionCount(selection);
  const container = document.getElementById('language-breakdown');
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  const sorted = Array.from(breakdown).sort((a,b) => d3.descending(a[1], b[1]));
  container.innerHTML = sorted.map(([lang, cnt]) => {
    const pct = d3.format('.1~%')(cnt / lines.length);
    return `<dt>${lang}</dt><dd>${cnt} lines (${pct})</dd>`;
  }).join('');
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('.dots circle')
    .classed('selected', d => isCommitSelected(selection, d));
  renderLanguageBreakdown(selection);
  if (event.type === 'end' && !selection) {
    d3.select('#selection-count').text('No commits selected');
    d3.select('#language-breakdown').html('');
  }
}

function renderScatterPlot(data, commits) {
  const width  = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usable = {
    left:   margin.left,
    right:  width - margin.right,
    top:    margin.top,
    bottom: height - margin.bottom,
    width:  width - margin.left - margin.right,
    height: height - margin.top  - margin.bottom
  };

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  d3.select('#chart').selectAll('svg').remove();

  const svg = d3.select('#chart')
    .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usable.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-usable.width)
        .tickFormat('')
    );

  svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${usable.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'axis y-axis')
    .attr('transform', `translate(${usable.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2,'0') + ':00')
    );

  const sorted = commits.slice().sort((a, b) => d3.descending(a.totalLines, b.totalLines));
  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sorted, d => d.id)
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => d3.scaleSqrt()
                         .domain(d3.extent(commits, c => c.totalLines))
                         .range([2,30])(d.totalLines))
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commit) => {
        if (!event.view.__brushing) {
          d3.select(event.currentTarget).style('fill-opacity', 1);
          renderTooltipContent(commit);
          updateTooltipPosition(event);
          updateTooltipVisibility(true);
        }
      })
      .on('mouseleave', (event) => {
        if (!event.view.__brushing) {
          d3.select(event.currentTarget).style('fill-opacity', 0.7);
          updateTooltipVisibility(false);
        }
      });
  const brush = d3.brush()
    .extent([[usable.left, usable.top], [usable.right, usable.bottom]])
    .on('start brush end', brushed);

  svg.append('g')
    .attr('class', 'brush')
    .call(brush);
}

function updateScatterPlot(data, commits) {
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  xScale.domain(d3.extent(commits, d => d.datetime));

  const xAxis = d3.axisBottom(xScale);
  const xG = d3.select('#chart').select('svg').select('g.x-axis');
  xG.selectAll('*').remove();
  xG.call(xAxis);

  const sorted = commits.slice().sort((a,b) => d3.descending(a.totalLines, b.totalLines));
  const dotsG = d3.select('#chart').select('svg').select('g.dots');

  dotsG.selectAll('circle')
    .data(sorted, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0)
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
          if (!event.view.__brushing) {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipPosition(event);
            updateTooltipVisibility(true);
          }
        })
        .on('mouseleave', (event) => {
          if (!event.view.__brushing) {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
          }
        })
        .call(enter => enter.transition().attr('r', d => rScale(d.totalLines))),
      update => update.call(update => update.transition()
        .attr('cx', d => xScale(d.datetime))
        .attr('r', d => rScale(d.totalLines))
      ),
      exit => exit.call(exit => exit.transition().attr('r', 0).remove())
    );
}

function updateFileDisplay(commits) {
  const allLines = commits.flatMap(d => d.lines);
  let files = d3.groups(allLines, d => d.file)
    .map(([name, lines]) => {

      return {
        name,
        lines,
        type: lines[0].type
      };
    });

  files.sort((a, b) => b.lines.length - a.lines.length);


  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  const container = d3.select('#files');
  const fileDivs = container.selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      }),
      update => update,
      exit => exit.remove()
    );


  fileDivs.select('dt > code')
    .html(d => `
      ${d.name}
      <small>${d.lines.length} lines</small>
    `);

  fileDivs
    .attr('style', d => `--color: ${colorScale(d.type)}`);

  fileDivs.select('dd')
    .selectAll('div')
    .data(d => d.lines)          // d.lines is the array of line‐objects
    .join('div')
      .attr('class', 'loc');
}

(async function() {
  const data    = await loadData();
  const commits = processCommits(data);   // sorted chronologically!
  const stats   = computeStats(data, commits);

  renderStats(stats);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);

  let commitProgress = 100;
  const timeScale = d3.scaleTime()
    .domain([
      d3.min(commits, d => d.datetime),
      d3.max(commits, d => d.datetime)
    ])
    .range([0, 100]);

  let commitMaxTime   = timeScale.invert(commitProgress);
  let filteredCommits = commits;

  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
      .attr('class', 'step')
      .html((d, i) => `
        <p>
          On <strong>${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short'
          })}</strong>,
          I made
          <a href="${d.url}" target="_blank">${
            i > 0
              ? 'another glorious commit'
              : 'my very first commit, and it was glorious'
          }</a>.
          I edited <strong>${d.totalLines}</strong> lines across
          <strong>${
            d3.rollups(
              d.lines,
              (arr) => arr.length,
              (row) => row.file
            ).length
          }</strong> files. Then I looked over all I had made, and I saw that it was very good.
        </p>
      `);

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.5    // trigger when the step’s middle hits the viewport midpoint (default 0.5)
    })
    .onStepEnter(onStepEnter);   // attach our handler

  function onStepEnter(response) {
    const commitDatum = response.element.__data__; 
    const cutoffDate  = commitDatum.datetime;

    const subset = commits.filter(d => d.datetime <= cutoffDate);

    updateScatterPlot(data, subset);

    d3.select('#commit-time')
      .text(
        cutoffDate.toLocaleString('en', {
          dateStyle: 'long',
          timeStyle: 'short'
        })
      );

    updateFileDisplay(subset);  
  }

  function onTimeSliderChange() {
    commitProgress = +d3.select('#commit-progress').property('value');
    commitMaxTime  = timeScale.invert(commitProgress);

    d3.select('#commit-time')
      .text(
        commitMaxTime.toLocaleString('en', {
          dateStyle: 'long',
          timeStyle: 'short'
        })
      );

    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
    updateScatterPlot(data, filteredCommits);

  }

  d3.select('#commit-progress')
    .on('input', onTimeSliderChange);

  onTimeSliderChange();
})();

