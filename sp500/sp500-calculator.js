// S&P 500 Historical Return Calculator - Logic
// Data loaded separately via sp500-data.js

// Month names in Portuguese
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Build data index for fast lookup
const dataIndex = {};
SP500_DATA.forEach(d => { dataIndex[d.month] = d; });

// Get available years
const years = [...new Set(SP500_DATA.map(d => parseInt(d.month.substring(0,4))))].sort((a,b) => a-b);
const minYear = years[0];
const maxYear = years[years.length - 1];

// Populate year dropdowns
function populateYears() {
  const startYearSel = document.getElementById('startYear');
  const endYearSel = document.getElementById('endYear');
  years.forEach(y => {
    const o1 = document.createElement('option');
    o1.value = y; o1.textContent = y;
    if (y === 2020) o1.selected = true;
    startYearSel.appendChild(o1);
    const o2 = document.createElement('option');
    o2.value = y; o2.textContent = y;
    if (y === 2026) o2.selected = true;
    endYearSel.appendChild(o2);
  });
  document.getElementById('endMonth').value = '2';
}

// Format number Portuguese style: 10.111,04$
function fmtNum(n, decimals = 2) {
  const fixed = Math.abs(n).toFixed(decimals);
  const parts = fixed.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const sign = n < 0 ? '-' : '';
  return decimals > 0 ? sign + intPart + ',' + decPart : sign + intPart;
}

function fmtCurrency(n) { return fmtNum(n) + '$'; }
function fmtPercent(n) { return (n >= 0 ? '+' : '') + fmtNum(n) + '%'; }

// Parse investment input
function parseInvestment(str) {
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

// Format input as user types
const investInput = document.getElementById('initialInvestment');
investInput.addEventListener('blur', function() {
  const val = parseInvestment(this.value);
  if (!isNaN(val) && val > 0) {
    this.value = fmtNum(val, val % 1 === 0 ? 0 : 2);
  }
});

// Get the data field key based on settings
function getFieldKey(reinvestDividends, adjustInflation) {
  if (reinvestDividends && adjustInflation) return 'realPricePlusDividend';
  if (reinvestDividends) return 'nominalPricePlusDividend';
  if (adjustInflation) return 'realPrice';
  return 'price';
}

// Build date key
function dateKey(year, month) {
  return year + '-' + String(month).padStart(2, '0') + '-01';
}

let chartInstance = null;
let currentTableData = [];

function calculate() {
  const errEl = document.getElementById('sp500Error');
  errEl.classList.add('sp500-hidden');

  const startMonth = parseInt(document.getElementById('startMonth').value);
  const startYear = parseInt(document.getElementById('startYear').value);
  const endMonth = parseInt(document.getElementById('endMonth').value);
  const endYear = parseInt(document.getElementById('endYear').value);
  const investment = parseInvestment(document.getElementById('initialInvestment').value);
  const reinvestDividends = document.querySelector('input[name="dividends"]:checked').value === 'yes';
  const adjustInflation = document.getElementById('adjustInflation').checked;

  if (isNaN(investment) || investment <= 0) {
    errEl.textContent = 'Por favor, introduz um valor de investimento válido.';
    errEl.classList.remove('sp500-hidden');
    return;
  }

  const startKey = dateKey(startYear, startMonth);
  const endKey = dateKey(endYear, endMonth);

  if (!dataIndex[startKey]) {
    errEl.textContent = 'Não existem dados para a data de início selecionada.';
    errEl.classList.remove('sp500-hidden');
    return;
  }
  if (!dataIndex[endKey]) {
    errEl.textContent = 'Não existem dados para a data de fim selecionada.';
    errEl.classList.remove('sp500-hidden');
    return;
  }

  if (startYear > endYear || (startYear === endYear && startMonth >= endMonth)) {
    errEl.textContent = 'A data de início deve ser anterior à data de fim.';
    errEl.classList.remove('sp500-hidden');
    return;
  }

  const field = getFieldKey(reinvestDividends, adjustInflation);
  const startVal = dataIndex[startKey][field];
  const endVal = dataIndex[endKey][field];
  const ratio = endVal / startVal;
  const finalValue = investment * ratio;
  const totalReturn = (ratio - 1) * 100;
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  const totalYears = totalMonths / 12;
  const annualReturn = (Math.pow(ratio, 1 / totalYears) - 1) * 100;

  // Update results card
  document.getElementById('resultsCard').classList.remove('sp500-hidden');
  document.getElementById('chartCard').classList.remove('sp500-hidden');

  // Subtitle
  let subtitle = '';
  if (!reinvestDividends && !adjustInflation) {
    subtitle = 'Valores apresentados sem dividendos reinvestidos.';
  } else if (reinvestDividends && !adjustInflation) {
    subtitle = 'Valores apresentados com os dividendos reinvestidos.';
  } else if (!reinvestDividends && adjustInflation) {
    subtitle = 'Valores apresentados ajustados à inflação, sem dividendos reinvestidos.';
  } else {
    subtitle = 'Valores apresentados com os dividendos reinvestidos e ajustados à inflação.';
  }
  document.getElementById('resultsSubtitle').textContent = subtitle;

  document.getElementById('resFinalValue').textContent = fmtCurrency(finalValue);
  document.getElementById('resFinalValue').className = 'sp500-result-value';

  const retEl = document.getElementById('resTotalReturn');
  retEl.textContent = fmtPercent(totalReturn);
  retEl.className = 'sp500-result-value ' + (totalReturn >= 0 ? 'positive' : 'negative');

  const annEl = document.getElementById('resAnnualReturn');
  annEl.textContent = fmtPercent(annualReturn);
  annEl.className = 'sp500-result-value ' + (annualReturn >= 0 ? 'positive' : 'negative');

  // Summary text
  let summaryText = 'Se tivesses investido ' + fmtNum(investment, investment % 1 === 0 ? 0 : 2) + '$ no S&P 500 em ' + MONTH_NAMES[startMonth - 1] + ' de ' + startYear;
  if (reinvestDividends) summaryText += ', com reinvestimento de dividendos,';
  if (adjustInflation) summaryText += (reinvestDividends ? ' e' : ',') + ' ajustado à inflação,';
  summaryText += ' o teu investimento valeria ' + fmtCurrency(finalValue) + ' em ' + MONTH_NAMES[endMonth - 1] + ' de ' + endYear;
  summaryText += ', um retorno total de ' + fmtPercent(totalReturn);
  summaryText += ', o que se traduz num retorno anual médio de ' + fmtPercent(annualReturn) + '.';
  document.getElementById('resSummary').textContent = summaryText;

  // Build year-by-year data for chart and table
  // Include month info and partial-year returns
  const yearlyData = [];
  let prevVal = null;
  const startFieldVal = dataIndex[startKey][field];

  for (let y = startYear; y <= endYear; y++) {
    let m;
    if (y === startYear) {
      m = startMonth;
    } else if (y === endYear) {
      m = endMonth;
    } else {
      // For intermediate years, use January
      m = 1;
    }
    const key = dateKey(y, m);
    if (!dataIndex[key]) continue;

    const val = dataIndex[key][field];
    const investmentVal = investment * (val / startFieldVal);
    let periodReturn = null;

    if (prevVal !== null) {
      periodReturn = ((val / prevVal) - 1) * 100;
    }

    yearlyData.push({
      year: y,
      month: m,
      value: investmentVal,
      periodReturn: periodReturn,
      rawVal: val
    });
    prevVal = val;
  }

  currentTableData = yearlyData;

  // Build chart
  buildChart(yearlyData, investment);

  // Build table
  buildTable(yearlyData, startMonth, startYear, endMonth, endYear);

  // Scroll to results
  setTimeout(() => {
    document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function buildChart(data, investment) {
  const ctx = document.getElementById('sp500Chart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = data.map(d => d.year);
  const returnValues = data.map(d => Math.max(0, d.value - investment));

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Rentabilidade total acumulada',
          data: returnValues,
          backgroundColor: '#FD8D2B',
          stack: 'Stack 0'
        },
        {
          label: 'Total investido',
          data: data.map(d => Math.min(investment, d.value)),
          backgroundColor: '#2970FF',
          stack: 'Stack 0'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: window.innerWidth < 768 ? 20 : 10 }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            color: '#3A4454',
            font: {
              family: 'Inter',
              size: 12,
              weight: '500',
              letterSpacing: '-0.0125em'
            },
            generateLabels: function(chart) {
              return chart.data.datasets.map(function(dataset, index) {
                var meta = chart.getDatasetMeta(index);
                return {
                  text: dataset.label,
                  fillStyle: dataset.backgroundColor,
                  strokeStyle: dataset.backgroundColor,
                  lineWidth: 0,
                  hidden: meta.hidden,
                  datasetIndex: index,
                  fontColor: meta.hidden ? 'rgba(58,68,84,0.5)' : '#3A4454',
                  opacity: meta.hidden ? 0.5 : 1
                };
              });
            }
          },
          onClick: function(e, legendItem, legend) {
            var meta = legend.chart.getDatasetMeta(legendItem.datasetIndex);
            meta.hidden = meta.hidden === null ? true : !meta.hidden;
            legend.chart.update();
          },
          onHover: function(event) { event.chart.canvas.style.cursor = 'pointer'; },
          onLeave: function(event) { event.chart.canvas.style.cursor = 'default'; }
        },
        tooltip: {
          displayColors: true,
          position: 'nearest',
          backgroundColor: '#121721',
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: 'Inter', size: 11, weight: '500' },
          titleColor: '#CED5DF',
          bodyFont: { family: 'Inter', size: 11, weight: '500' },
          bodyColor: '#E6E6E6',
          usePointStyle: true,
          bodySpacing: 5,
          boxPadding: 3,
          callbacks: {
            title: function(items) { return items[0].label; },
            label: function(ctx) { return ' ' + ctx.dataset.label + ': ' + fmtCurrency(ctx.parsed.y); },
            labelColor: function(context) {
              return {
                backgroundColor: context.dataset.backgroundColor,
                borderColor: context.dataset.backgroundColor,
                borderWidth: 0,
                borderRadius: 50
              };
            }
          }
        },
        title: {
          display: true,
          text: 'Capital total',
          align: 'start',
          color: '#3A4454',
          font: {
            family: 'Inter',
            size: 13,
            weight: '500',
            letterSpacing: '-0.0125em'
          },
          padding: { top: 0, bottom: 25 }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Anos',
            align: 'end',
            color: '#3A4454',
            font: {
              family: 'Inter',
              size: 13,
              weight: '500',
              letterSpacing: '-0.0125em'
            },
            padding: { top: 10 }
          },
          ticks: {
            color: '#4F5969',
            font: {
              family: 'Inter',
              size: 10,
              weight: '500',
              letterSpacing: '-0.0125em'
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 15
          },
          grid: { drawOnChartArea: false }
        },
        y: {
          stacked: true,
          title: { display: false },
          ticks: {
            color: '#4F5969',
            font: {
              family: 'Inter',
              size: 10,
              weight: '500',
              letterSpacing: '-0.0125em'
            },
            callback: function(v) {
              if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'M $';
              if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k $';
              return v + ' $';
            }
          }
        }
      }
    }
  });
}

function buildTable(data, startMonth, startYear, endMonth, endYear) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  data.forEach(function(d, i) {
    var tr = document.createElement('tr');

    var tdPeriod = document.createElement('td');
    // Show "Mon YYYY" for first and last rows, just "YYYY" for intermediate
    if (i === 0 || i === data.length - 1) {
      tdPeriod.textContent = MONTH_SHORT[d.month - 1] + ' ' + d.year;
    } else {
      tdPeriod.textContent = d.year;
    }

    var tdValue = document.createElement('td');
    tdValue.textContent = fmtCurrency(d.value);

    var tdReturn = document.createElement('td');
    if (d.periodReturn !== null) {
      tdReturn.textContent = fmtPercent(d.periodReturn);
      tdReturn.className = d.periodReturn >= 0 ? 'positive' : 'negative';
    } else {
      tdReturn.textContent = '—';
      tdReturn.style.color = '#96a0b0';
    }

    tr.appendChild(tdPeriod);
    tr.appendChild(tdValue);
    tr.appendChild(tdReturn);
    tbody.appendChild(tr);
  });
}

function switchTab(tab) {
  document.getElementById('tabChart').classList.toggle('active', tab === 'chart');
  document.getElementById('tabTable').classList.toggle('active', tab === 'table');
  document.getElementById('chartView').classList.toggle('sp500-hidden', tab !== 'chart');
  document.getElementById('tableView').classList.toggle('sp500-hidden', tab !== 'table');
}

function toggleDownloadMenu(e) {
  e.stopPropagation();
  document.getElementById('downloadMenu').classList.toggle('show');
}

document.addEventListener('click', function() {
  document.getElementById('downloadMenu').classList.remove('show');
});

function downloadChart() {
  if (!chartInstance) return;
  var link = document.createElement('a');
  link.download = 'sp500-retorno-historico.png';
  link.href = chartInstance.canvas.toDataURL('image/png');
  link.click();
  document.getElementById('downloadMenu').classList.remove('show');
}

function downloadCSV() {
  if (!currentTableData.length) return;
  var csv = 'Período,Valor do investimento,Retorno do período\n';
  currentTableData.forEach(function(d, i) {
    var period = (i === 0 || i === currentTableData.length - 1) ? MONTH_SHORT[d.month - 1] + ' ' + d.year : '' + d.year;
    var ret = d.periodReturn !== null ? d.periodReturn.toFixed(2) + '%' : '';
    csv += period + ',' + d.value.toFixed(2) + ',' + ret + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var link = document.createElement('a');
  link.download = 'sp500-retorno-historico.csv';
  link.href = URL.createObjectURL(blob);
  link.click();
  document.getElementById('downloadMenu').classList.remove('show');
}

// Inject watermark SVG
(function(){
  var wm=document.getElementById('sp500Watermark');
  if(wm)wm.innerHTML='<svg viewBox="0 0 158 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M152.748 10.817c.436 0 .736-.165 1.157-.48V7.527l-1.292.526c-.631.24-1.022.586-1.022 1.427 0 .781.361 1.337 1.157 1.337Zm3.23-4.597v3.981c0 .511.105.841.496.841.225 0 .436-.075.601-.15l.09.33c-.436.511-1.007.796-1.713.796-.811 0-1.352-.496-1.502-1.322-.481.631-1.262 1.292-2.344 1.292-1.217 0-2.028-.736-2.028-1.938 0-1.292.931-1.818 2.058-2.238l2.269-.826V5.709c0-.856-.286-1.472-1.067-1.472-.721 0-1.007.541-1.007 1.262 0 .3.045.601.121.931l-1.247.165c-.406-.135-.661-.45-.661-.946 0-1.247 1.292-1.893 2.959-1.893 1.923 0 2.975.706 2.975 2.464Z" fill="#96A0B0"/><path d="M146.541 6.445v4.147c0 .616.346.706 1.277.781v.496h-4.297v-.496c.706-.045.947-.135.947-.661V5.394l-.902-.526v-.286l2.69-.826h.345l-.06 2.223c.721-1.638 1.172-2.224 2.058-2.224.316 0 .541.106.661.256v1.623h-.285c-.931 0-1.668.045-2.434.811Z" fill="#96A0B0"/><path d="M142.188 3.756v6.956c0 .526.24.616.947.661v.496h-3.967v-.496c.706-.045.947-.135.947-.661V5.394l-.902-.526v-.286l2.644-.826h.331Zm-1.067-.901c-.721 0-1.217-.556-1.217-1.187 0-.646.496-1.187 1.217-1.187.736 0 1.232.541 1.232 1.187 0 .631-.496 1.187-1.232 1.187Z" fill="#96A0B0"/><path d="M135.621 3.756c2.013 0 3.065 1.337 3.065 3.14v.346h-4.898c-.06 2.103 1.022 3.35 2.494 3.35 1.022 0 1.698-.435 2.239-1.217l.285.181c-.706 1.457-1.818 2.433-3.44 2.433-2.329 0-3.651-1.668-3.651-4.086 0-2.494 1.503-4.147 3.906-4.147Zm.961 3.035c.03-.09.045-.225.045-.39 0-1.247-.466-2.194-1.187-2.194-.796 0-1.337.721-1.712 2.584h2.854Z" fill="#96A0B0"/><path d="M128.649 3.756c1.893 0 2.99 1.442 2.99 3.71 0 2.659-1.503 4.523-3.832 4.523-.736 0-1.307-.24-1.758-.631l-.045 2.659c0 .526.255.616 1.157.661v.496h-4.312v-.496c.706-.045.947-.135.947-.661V5.394l-.902-.526v-.286l2.63-.826h.33l.046 1.412c.706-1.112 1.637-1.412 2.749-1.412Zm-.766 7.286c.961 0 1.397-.751 1.397-3.546 0-2.328-.571-3.26-1.487-3.26-.601 0-1.037.39-1.337.931-.15.27-.27.571-.406.931v3.546c0 .961.601 1.398 1.833 1.398Z" fill="#96A0B0"/><path d="M115.103 3.756c2.013 0 3.065 1.337 3.065 3.14v.346h-4.898c-.06 2.103 1.022 3.35 2.494 3.35 1.022 0 1.698-.435 2.239-1.217l.285.181c-.706 1.457-1.818 2.433-3.44 2.433-2.329 0-3.651-1.668-3.651-4.086 0-2.494 1.503-4.147 3.906-4.147Zm.962 3.035c.03-.09.044-.225.044-.39 0-1.247-.465-2.194-1.186-2.194-.796 0-1.337.721-1.713 2.584h2.855Z" fill="#96A0B0"/><path d="M106.963 3.756c1.638 0 2.87.916 2.87 2.343 0 1.503-1.277 2.284-2.555 2.584l1.698 1.608c.586.556 1.067.751 1.788.751v.496c-.285.24-.631.45-1.097.45-1.022 0-1.638-.48-2.464-1.292l-1.578-1.578v2.194c0 .526.24.616.946.661v.496h-3.966v-.496c.706-.045.946-.135.946-.661V1.488l-.901-.526V.676l2.629-.196h.331v6.07c1.232-.585 2.584-1.427 2.584-2.554 0-.631-.465-1.006-1.141-1.006-.301 0-.571.06-.886.195l-.15-.33c.571-.661 1.322-1.098 2.148-1.098 1.142 0 1.863.706 1.863 1.698 0 1.082-.871 1.668-2.344 2.344l-2.074.946v.796l1.353-1.352V5.88Z" fill="#96A0B0"/><path d="M96.08 3.756c2.388 0 3.876 1.578 3.876 4.086 0 2.494-1.488 4.147-3.876 4.147-2.404 0-3.891-1.578-3.891-4.086 0-2.494 1.487-4.147 3.891-4.147Zm0 7.781c.976 0 1.367-.826 1.367-3.621 0-2.81-.391-3.71-1.367-3.71-.991 0-1.382.826-1.382 3.636 0 2.81.391 3.695 1.382 3.695Z" fill="#96A0B0"/><path d="M86.447 3.756c2.013 0 3.065 1.337 3.065 3.14v.346h-4.898c-.06 2.103 1.022 3.35 2.494 3.35 1.022 0 1.698-.435 2.239-1.217l.285.181c-.706 1.457-1.818 2.433-3.44 2.433-2.329 0-3.651-1.668-3.651-4.086 0-2.494 1.503-4.147 3.906-4.147Zm.961 3.035c.03-.09.045-.225.045-.39 0-1.247-.466-2.194-1.187-2.194-.796 0-1.337.721-1.712 2.584h2.854Z" fill="#96A0B0"/><path d="M82.244 3.756v6.956c0 .526.24.616.946.661v.496h-3.966v-.496c.706-.045.946-.135.946-.661V5.394l-.901-.526v-.286l2.644-.826h.331Zm-1.067-.901c-.721 0-1.217-.556-1.217-1.187 0-.646.496-1.187 1.217-1.187.736 0 1.232.541 1.232 1.187 0 .631-.496 1.187-1.232 1.187Z" fill="#96A0B0"/><path d="M73.759 11.037c1.367 0 2.224-.45 2.975-1.307l.3.181c-.796 1.397-2.013 2.073-3.576 2.073-2.509 0-4.027-1.728-4.027-4.146 0-2.449 1.548-4.082 4.072-4.082 1.457 0 2.614.646 3.2 1.923l-.315.195c-.931-.48-1.623-.69-2.434-.69-1.592 0-2.344 1.188-2.344 3.11 0 1.728.586 2.743 2.149 2.743Z" fill="#96A0B0"/><path d="M67.22 3.756v6.956c0 .526.255.616.961.661v.496h-3.966v-.496c.706-.045.946-.135.946-.661V5.394l-.901-.526v-.286l2.644-.826h.316Zm-1.052-.901c-.721 0-1.217-.556-1.217-1.187 0-.646.496-1.187 1.217-1.187.736 0 1.232.541 1.232 1.187 0 .631-.496 1.187-1.232 1.187Z" fill="#96A0B0"/><path d="M60.437 3.756c2.013 0 3.065 1.337 3.065 3.14v.346h-4.898c-.06 2.103 1.022 3.35 2.494 3.35 1.022 0 1.698-.435 2.239-1.217l.285.181c-.706 1.457-1.818 2.433-3.44 2.433-2.329 0-3.651-1.668-3.651-4.086 0-2.494 1.503-4.147 3.906-4.147Zm.961 3.035c.03-.09.045-.225.045-.39 0-1.247-.466-2.194-1.187-2.194-.796 0-1.337.721-1.712 2.584h2.854Z" fill="#96A0B0"/><path d="M53.465 3.756c1.893 0 2.99 1.442 2.99 3.71 0 2.659-1.503 4.523-3.831 4.523-.736 0-1.307-.24-1.758-.631l-.046 2.659c0 .526.256.616 1.158.661v.496H47.65v-.496c.706-.045.946-.135.946-.661V5.394l-.901-.526v-.286l2.629-.826h.331l.045 1.412c.706-1.112 1.638-1.412 2.75-1.412h.015Zm-.766 7.286c.961 0 1.397-.751 1.397-3.546 0-2.328-.571-3.26-1.487-3.26-.601 0-1.037.39-1.337.931-.15.27-.27.571-.406.931v3.546c0 .961.601 1.398 1.833 1.398Z" fill="#96A0B0"/><path d="M39.919 3.756c2.013 0 3.065 1.337 3.065 3.14v.346h-4.898c-.06 2.103 1.022 3.35 2.494 3.35 1.022 0 1.698-.435 2.239-1.217l.285.181c-.706 1.457-1.818 2.433-3.44 2.433-2.329 0-3.651-1.668-3.651-4.086 0-2.494 1.503-4.147 3.906-4.147Zm.961 3.035c.03-.09.045-.225.045-.39 0-1.247-.466-2.194-1.187-2.194-.796 0-1.337.721-1.712 2.584h2.854Z" fill="#96A0B0"/><path d="M33.038 6.445v4.147c0 .616.346.706 1.277.781v.496h-4.297v-.496c.706-.045.947-.135.947-.661V5.394l-.902-.526v-.286l2.69-.826h.345l-.06 2.223c.721-1.638 1.172-2.224 2.058-2.224.316 0 .541.106.661.256v1.623h-.285c-.931 0-1.668.045-2.434.811Z" fill="#96A0B0"/><path d="M28.685 3.756v6.956c0 .526.24.616.946.661v.496h-3.966v-.496c.706-.045.946-.135.946-.661V5.394l-.901-.526v-.286l2.644-.826h.331Zm-1.067-.901c-.721 0-1.217-.556-1.217-1.187 0-.646.496-1.187 1.217-1.187.736 0 1.232.541 1.232 1.187 0 .631-.496 1.187-1.232 1.187Z" fill="#96A0B0"/><path d="M22.765 1.488v9.224c0 .526.24.616.946.661v.496h-3.966v-.496c.706-.045.946-.135.946-.661V1.488l-.901-.526V.676l2.644-.196h.331Z" fill="#96A0B0"/></svg>';
}());

// Init
populateYears();
document.getElementById('calcBtn').addEventListener('click', calculate);
