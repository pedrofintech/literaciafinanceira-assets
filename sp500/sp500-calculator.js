// S&P 500 Historical Return Calculator - Logic
// Data loaded separately via sp500-data.js

// Month names in Portuguese
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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
  // Set default end month to February
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

function fmtCurrency(n) {
  return fmtNum(n) + '$';
}

function fmtPercent(n) {
  return (n >= 0 ? '+' : '') + fmtNum(n) + '%';
}

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

  // Validation
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
  const yearlyData = [];
  let prevVal = null;
  const startData = dataIndex[startKey];
  const startFieldVal = startData[field];

  for (let y = startYear; y <= endYear; y++) {
    let m, key;
    if (y === startYear) {
      m = startMonth;
    } else if (y === endYear) {
      m = endMonth;
    } else {
      m = 1;
    }
    key = dateKey(y, m);
    if (!dataIndex[key]) continue;
    
    const val = dataIndex[key][field];
    const investmentVal = investment * (val / startFieldVal);
    let annualRet = null;

    if (prevVal !== null) {
      annualRet = ((val / prevVal) - 1) * 100;
    }

    yearlyData.push({
      year: y,
      month: m,
      value: investmentVal,
      annualReturn: annualRet,
      rawVal: val
    });
    prevVal = val;
  }

  currentTableData = yearlyData;

  // Build chart
  buildChart(yearlyData, investment);

  // Build table
  buildTable(yearlyData);

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
          backgroundColor: '#fc8c2a',
          borderRadius: { topLeft: 4, topRight: 4 },
          barPercentage: 0.65,
          categoryPercentage: 0.75,
          order: 1
        },
        {
          label: 'Total investido',
          data: data.map(d => Math.min(investment, d.value)),
          backgroundColor: '#2970fe',
          borderRadius: 0,
          barPercentage: 0.65,
          categoryPercentage: 0.75,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          reverse: false,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            pointStyleWidth: 10,
            padding: 20,
            font: { family: 'Inter', size: 12, weight: '500' },
            color: '#3a4453'
          }
        },
        tooltip: {
          backgroundColor: '#121721',
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: function(items) {
              return items[0].label;
            },
            label: function(ctx) {
              const val = ctx.parsed.y;
              return ' ' + ctx.dataset.label + ': ' + fmtCurrency(val);
            },
            afterBody: function(items) {
              const idx = items[0].dataIndex;
              const d = data[idx];
              return '\n Total: ' + fmtCurrency(d.value);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#697386',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 15
          },
          border: { display: false }
        },
        y: {
          stacked: true,
          grid: { color: '#f2f4f7' },
          border: { display: false },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#697386',
            callback: function(value) {
              if (value >= 1000000) return fmtNum(value / 1000000, 1) + 'M $';
              if (value >= 1000) return fmtNum(value / 1000, 0) + 'k $';
              return fmtNum(value, 0) + ' $';
            }
          },
          title: {
            display: true,
            text: 'Capital total ($)',
            font: { family: 'Inter', size: 12, weight: '500' },
            color: '#697386'
          }
        }
      }
    }
  });
}

function buildTable(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  data.forEach((d, i) => {
    const tr = document.createElement('tr');
    const tdYear = document.createElement('td');
    tdYear.textContent = d.year;
    const tdValue = document.createElement('td');
    tdValue.textContent = fmtCurrency(d.value);
    const tdReturn = document.createElement('td');
    if (d.annualReturn !== null) {
      tdReturn.textContent = fmtPercent(d.annualReturn);
      tdReturn.className = d.annualReturn >= 0 ? 'positive' : 'negative';
    } else {
      tdReturn.textContent = '—';
      tdReturn.style.color = '#96a0b0';
    }
    tr.appendChild(tdYear);
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
  const link = document.createElement('a');
  link.download = 'sp500-retorno-historico.png';
  link.href = chartInstance.canvas.toDataURL('image/png');
  link.click();
  document.getElementById('downloadMenu').classList.remove('show');
}

function downloadCSV() {
  if (!currentTableData.length) return;
  let csv = 'Ano,Valor do investimento,Retorno anual\n';
  currentTableData.forEach(d => {
    const ret = d.annualReturn !== null ? d.annualReturn.toFixed(2) + '%' : '';
    csv += d.year + ',' + d.value.toFixed(2) + ',' + ret + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.download = 'sp500-retorno-historico.csv';
  link.href = URL.createObjectURL(blob);
  link.click();
  document.getElementById('downloadMenu').classList.remove('show');
}

// Init
populateYears();
document.getElementById('calcBtn').addEventListener('click', calculate);
