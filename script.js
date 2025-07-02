document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let dataPeriod1 = [];
    let dataPeriod2 = [];
    let filteredData = [];
    let dateRange1 = null;
    let dateRange2 = null;
    let charts = {};

    // --- DOM ELEMENTS (File Upload) ---
    const uploadContainer1 = document.getElementById('upload-container-1');
    const uploadContainer2 = document.getElementById('upload-container-2');
    const fileInput1 = document.getElementById('csv-file-1');
    const fileInput2 = document.getElementById('csv-file-2');
    const fileName1 = document.getElementById('file-name-1');
    const fileName2 = document.getElementById('file-name-2');
    const dateRangeEl1 = document.getElementById('date-range-1');
    const dateRangeEl2 = document.getElementById('date-range-2');
    const uploadLabel2 = document.getElementById('upload-label-2');

    // --- DOM ELEMENTS (API Fetch) ---
    const apiUrlInput = document.getElementById('api-url');
    const apiStart1Input = document.getElementById('api-start-1');
    const apiEnd1Input = document.getElementById('api-end-1');
    const apiStart2Input = document.getElementById('api-start-2');
    const apiEnd2Input = document.getElementById('api-end-2');
    const fetchApiBtn = document.getElementById('fetch-api-data');
    const apiPresets1 = document.getElementById('api-presets-1');
    const apiPresets2 = document.getElementById('api-presets-2');

    // --- GENERAL DOM ELEMENTS ---
    const dashboard = document.getElementById('dashboard');
    const statusContainer = document.getElementById('status-container');
    const statusMessage = document.getElementById('status-message');
    const loader = document.getElementById('loader');
    const dataTable = document.getElementById('data-table');
    const minTransInput = document.getElementById('min-trans');
    const maxTransInput = document.getElementById('max-trans');
    const exportBtn = document.getElementById('export-csv');
    const noResultsEl = document.getElementById('no-results');
    const tableDescription = document.getElementById('table-description');

    // --- HELPER FUNCTIONS ---
    const showStatus = (message, showLoader = true) => {
        statusContainer.classList.remove('hidden');
        statusMessage.textContent = message;
        loader.style.display = showLoader ? 'block' : 'none';
        dashboard.classList.add('hidden');
    };

    const hideStatus = () => {
        statusContainer.classList.add('hidden');
    };

    const showError = (message) => {
        showStatus(message, false);
        statusMessage.classList.add('text-red-600');
    };
    
    const resetError = () => {
        statusMessage.classList.remove('text-red-600');
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00'); // Treat as local time
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    const parseAndProcessData = (csvText, period) => {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const requiredColumns = ['First Name', 'Last Name', 'Phone Number', 'LGA', 'Transaction Count', 'Total Amount'];
                    const missingColumns = requiredColumns.filter(col => !results.meta.fields.includes(col));
                    if (missingColumns.length > 0) {
                        return reject(new Error(`Missing required columns in data for period ${period}: ${missingColumns.join(', ')}`));
                    }
                    
                    const parsedData = results.data.map(row => ({
                        ...row,
                        'Transaction Count': parseInt(row['Transaction Count'], 10) || 0,
                        'Total Amount': parseFloat(row['Total Amount']) || 0,
                    }));

                    if (period === 1) {
                        dataPeriod1 = parsedData;
                    } else {
                        dataPeriod2 = parsedData;
                    }
                    resolve();
                },
                error: (error) => reject(new Error(`CSV Parsing Error for period ${period}: ${error.message}`))
            });
        });
    };

    // --- DATA INPUT HANDLERS ---
    const handleFileUpload = (file, period) => {
        if (!file) return;
        
        resetError();
        showStatus(`Processing ${file.name}...`);
        
        const dateRange = { start: 'File', end: 'Data' }; // Placeholder for filename-based dates
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await parseAndProcessData(e.target.result, period);
                if (period === 1) {
                    dateRange1 = dateRange;
                    fileName1.textContent = file.name;
                    dateRangeEl1.textContent = '';
                    enablePeriod2Upload();
                    hideStatus();
                } else {
                    dateRange2 = dateRange;
                    fileName2.textContent = file.name;
                    dateRangeEl2.textContent = '';
                    analyzeData();
                }
            } catch (error) {
                showError(error.message);
            }
        };
        reader.readAsText(file);
    };

    const handleApiFetch = async () => {
        const baseUrl = apiUrlInput.value.trim();
        const start1 = apiStart1Input.value;
        const end1 = apiEnd1Input.value;
        const start2 = apiStart2Input.value;
        const end2 = apiEnd2Input.value;

        if (!baseUrl || !start1 || !end1 || !start2 || !end2) {
            alert('Please fill in the Base API URL and select all dates.');
            return;
        }

        resetError();
        showStatus('Fetching data from API...');

        dateRange1 = { start: start1, end: end1 };
        dateRange2 = { start: start2, end: end2 };
        
        const url1 = `${baseUrl}?download=retained-user-stats&startDate=${start1}&endDate=${end1}`;
        const url2 = `${baseUrl}?download=retained-user-stats&startDate=${start2}&endDate=${end2}`;

        try {
            const [response1, response2] = await Promise.all([fetch(url1), fetch(url2)]);

            if (!response1.ok) throw new Error(`API error for Period 1: ${response1.status} ${response1.statusText}`);
            if (!response2.ok) throw new Error(`API error for Period 2: ${response2.status} ${response2.statusText}`);

            const [csvText1, csvText2] = await Promise.all([response1.text(), response2.text()]);

            await Promise.all([parseAndProcessData(csvText1, 1), parseAndProcessData(csvText2, 2)]);
            
            analyzeData();

        } catch (error) {
            console.error(error);
            showError(`Failed to fetch or process API data. Check console for details. Error: ${error.message}`);
        }
    };


    const enablePeriod2Upload = () => {
        uploadContainer2.classList.remove('disabled');
        uploadLabel2.classList.remove('cursor-not-allowed');
        uploadLabel2.classList.add('cursor-pointer');
        fileInput2.disabled = false;
        fileName2.textContent = 'Drag & drop or click to upload';
    };

    // --- CORE ANALYSIS LOGIC ---
    const analyzeData = () => {
        showStatus('Analyzing data...');
        
        const usersP1 = new Set(dataPeriod1.map(u => u['Phone Number']));
        const usersP2 = new Set(dataPeriod2.map(u => u['Phone Number']));
        const retainedUsersSet = new Set([...usersP1].filter(phone => usersP2.has(phone)));
        const newUsersSet = new Set([...usersP2].filter(phone => !usersP1.has(phone)));
        const churnedUsersSet = new Set([...usersP1].filter(phone => !usersP2.has(phone)));
        const retentionRate = usersP1.size > 0 ? (retainedUsersSet.size / usersP1.size * 100).toFixed(1) : 0;
        
        document.getElementById('retention-rate').textContent = `${retentionRate}%`;
        document.getElementById('retained-users').textContent = retainedUsersSet.size;
        document.getElementById('new-users').textContent = newUsersSet.size;
        document.getElementById('churned-users').textContent = churnedUsersSet.size;
        document.getElementById('total-users').textContent = usersP2.size;

        const period1Text = dateRange1.start === 'File' ? 'in Period 1' : `from ${formatDate(dateRange1.start)} to ${formatDate(dateRange1.end)}`;
        const period2Text = dateRange2.start === 'File' ? 'in Period 2' : `from ${formatDate(dateRange2.start)} to ${formatDate(dateRange2.end)}`;
        document.getElementById('retained-when').textContent = period2Text;
        document.getElementById('new-when').textContent = period2Text;
        document.getElementById('churned-when').textContent = period1Text;
        document.getElementById('total-when').textContent = period2Text;

        const retainedData = dataPeriod2.filter(u => retainedUsersSet.has(u['Phone Number']));
        const newData = dataPeriod2.filter(u => newUsersSet.has(u['Phone Number']));
        const churnedData = dataPeriod1.filter(u => churnedUsersSet.has(u['Phone Number']));

        createPopupTable('retained-popup', retainedData);
        createPopupTable('new-popup', newData);
        createPopupTable('churned-popup', churnedData);
        createPopupTable('total-popup', dataPeriod2);

        tableDescription.textContent = `Showing ${dataPeriod2.length} users ${period2Text}`;

        renderCharts({ p1: { count: usersP1.size }, p2: { count: usersP2.size }, retained: retainedUsersSet.size });
        
        const totalTransactionsP1 = dataPeriod1.reduce((sum, u) => sum + u['Transaction Count'], 0);
        const totalTransactionsP2 = dataPeriod2.reduce((sum, u) => sum + u['Transaction Count'], 0);
        const totalAmountP1 = dataPeriod1.reduce((sum, u) => sum + u['Total Amount'], 0);
        const totalAmountP2 = dataPeriod2.reduce((sum, u) => sum + u['Total Amount'], 0);
        
        renderTransactionChart({
            p1: { count: totalTransactionsP1, amount: totalAmountP1 },
            p2: { count: totalTransactionsP2, amount: totalAmountP2 }
        });

        filteredData = [...dataPeriod2];
        renderTable(filteredData);

        hideStatus();
        dashboard.classList.remove('hidden');
    };

    // --- RENDERING FUNCTIONS ---
    const createPopupTable = (popupId, data) => {
        const container = document.getElementById(popupId);
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">No users to show.</p>`;
            return;
        }
        const table = document.createElement('table');
        table.className = 'popup-table';
        table.innerHTML = `
            <thead><tr><th>Name</th><th>Transactions</th><th>Phone</th></tr></thead>
            <tbody>${data.slice(0, 10).map(row => `<tr><td>${row['First Name']} ${row['Last Name']}</td><td style="text-align: center;">${row['Transaction Count']}</td><td>${row['Phone Number']}</td></tr>`).join('')}</tbody>
        `;
        container.appendChild(table);
        const footer = document.createElement('div');
        footer.className = 'popup-footer';
        const remainingText = document.createElement('span');
        remainingText.textContent = data.length > 10 ? `...and ${data.length - 10} more.` : `Total: ${data.length} users.`;
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy All';
        copyButton.className = 'popup-copy-button';
        copyButton.addEventListener('click', () => {
            const headers = "First Name\tLast Name\tTransaction Count\tPhone Number\n";
            const tsv = data.map(row => `${row['First Name']}\t${row['Last Name']}\t${row['Transaction Count']}\t${row['Phone Number']}`).join('\n');
            navigator.clipboard.writeText(headers + tsv).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                setTimeout(() => { copyButton.textContent = 'Copy All'; copyButton.classList.remove('copied'); }, 2000);
            }).catch(err => console.error('Failed to copy text: ', err));
        });
        footer.appendChild(remainingText);
        footer.appendChild(copyButton);
        container.appendChild(footer);
    };

    const renderTable = (data) => {
        dataTable.innerHTML = '';
        noResultsEl.classList.toggle('hidden', data.length > 0);
        const fragment = document.createDocumentFragment();
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">${row['First Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">${row['Last Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row['Phone Number']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row['LGA'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row['Store Name'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">${row['Transaction Count']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(row['Total Amount'])}</td>
            `;
            fragment.appendChild(tr);
        });
        dataTable.appendChild(fragment);
    };

    const destroyCharts = () => { Object.values(charts).forEach(chart => { if (chart) chart.destroy(); }); charts = {}; };

    const renderCharts = (data) => {
        if (charts.userChart) charts.userChart.destroy();
        const userCtx = document.getElementById('user-chart').getContext('2d');
        charts.userChart = new Chart(userCtx, { type: 'bar', data: { labels: [`Period 1 Users`, `Period 2 Users`], datasets: [{ label: 'Total Users', data: [data.p1.count, data.p2.count], backgroundColor: ['#60a5fa', '#34d399'], borderColor: ['#3b82f6', '#10b981'], borderWidth: 1 }, { label: 'Retained', data: [0, data.retained], backgroundColor: '#a78bfa', borderColor: '#8b5cf6', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { beginAtZero: true } } } });
    };

    const renderTransactionChart = (data) => {
        if (charts.transactionChart) charts.transactionChart.destroy();
        const transactionCtx = document.getElementById('transaction-chart').getContext('2d');
        charts.transactionChart = new Chart(transactionCtx, { type: 'bar', data: { labels: [`Period 1`, `Period 2`], datasets: [{ label: 'Transaction Volume (Count)', data: [data.p1.count, data.p2.count], backgroundColor: '#fbbf24', borderColor: '#f59e0b', borderWidth: 1 }, { label: 'Transaction Value (₦)', data: [data.p1.amount, data.p2.amount], backgroundColor: '#60a5fa', borderColor: '#3b82f6', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.dataset.label.includes('Value')) { label += new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(context.parsed.y); } else { label += context.parsed.y; } return label; } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function(value) { if (value >= 1000000) return (value / 1000000) + 'M'; if (value >= 1000) return (value / 1000) + 'K'; return value; } } } } } });
    };

    // --- EVENT LISTENERS & INITIALIZATION ---
    fileInput1.addEventListener('change', () => handleFileUpload(fileInput1.files[0], 1));
    fileInput2.addEventListener('change', () => handleFileUpload(fileInput2.files[0], 2));
    fetchApiBtn.addEventListener('click', handleApiFetch);
    
    [uploadContainer1, uploadContainer2].forEach((container, index) => {
        container.addEventListener('dragover', (e) => { e.preventDefault(); if (!container.classList.contains('disabled')) container.classList.add('dragover'); });
        container.addEventListener('dragleave', (e) => { e.preventDefault(); container.classList.remove('dragover'); });
        container.addEventListener('drop', (e) => { e.preventDefault(); container.classList.remove('dragover'); if (!container.classList.contains('disabled')) { const files = e.dataTransfer.files; if (files.length) { const fileInput = index === 0 ? fileInput1 : fileInput2; fileInput.files = files; handleFileUpload(files[0], index + 1); } } });
    });

    const applyFilters = () => {
        const min = parseInt(minTransInput.value, 10);
        const max = parseInt(maxTransInput.value, 10);
        filteredData = dataPeriod2.filter(row => { const count = row['Transaction Count']; const minMatch = isNaN(min) || count >= min; const maxMatch = isNaN(max) || count <= max; return minMatch && maxMatch; });
        renderTable(filteredData);
    };
    minTransInput.addEventListener('input', applyFilters);
    maxTransInput.addEventListener('input', applyFilters);

    exportBtn.addEventListener('click', () => {
        if (filteredData.length === 0) { alert('No data to export.'); return; }
        const csv = Papa.unparse(filteredData, {
            columns: ['First Name', 'Last Name', 'Phone Number', 'LGA', 'Store Name', 'Transaction Count', 'Total Amount']
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `filtered-users-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Date Presets Initialization
    const initDatePresets = () => {
        const presets = [
            //{ label: 'Last 7 Days', days: 7 },
            //{ label: 'Last 30 Days', days: 30 },
            //{ label: 'This Month', type: 'month' },
            //{ label: 'Last Month', type: 'last-month' },
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const createButton = (preset, period) => {
            const btn = document.createElement('button');
            btn.className = 'date-preset-btn';
            btn.textContent = preset.label;
            btn.type = 'button'; // Prevent form submission if ever inside a form
            btn.addEventListener('click', () => {
                let start, end;
                const toYYYYMMDD = (d) => d.toISOString().split('T')[0];

                if (preset.type === 'month') {
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                } else if (preset.type === 'last-month') {
                    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    end = new Date(today.getFullYear(), today.getMonth(), 0);
                } else { // days
                    end = new Date(today);
                    start = new Date(today);
                    start.setDate(start.getDate() - (preset.days - 1));
                }

                document.getElementById(`api-start-${period}`).value = toYYYYMMDD(start);
                document.getElementById(`api-end-${period}`).value = toYYYYMMDD(end);
            });
            return btn;
        };

        presets.forEach(p => {
            apiPresets1.appendChild(createButton(p, 1));
            apiPresets2.appendChild(createButton(p, 2));
        });
    };

    initDatePresets();
});