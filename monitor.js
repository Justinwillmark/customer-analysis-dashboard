document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monitorInfo = document.getElementById('monitor-info');
    const churnPeriodInfo = document.getElementById('churn-period-info');
    const reactivatedCount = document.getElementById('reactivated-count');
    const reactivatedProgress = document.getElementById('reactivated-progress');
    const timeRemainingEl = document.getElementById('time-remaining');
    const monitorTable = document.getElementById('monitor-table');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshBtnText = document.getElementById('refresh-btn-text');
    const refreshIcon = document.getElementById('refresh-icon');
    const loadingSpinner = document.getElementById('loading-spinner');
    const searchInput = document.getElementById('search-monitor-input');
    const noResults = document.getElementById('no-results');

    // State
    let monitorData = null;
    let assignedUsers = [];

    // Helper Functions
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    const formatPeriodText = (range) => {
        if (!range || !range.start || range.start === 'File') return 'a previous period';

        const startDate = new Date(range.start + 'T00:00:00');
        const endDate = new Date(range.end + 'T00:00:00');
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear !== endYear) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
    };

    const toYYYYMMDD = (d) => d.toISOString().split('T')[0];

    const decodeMonitorData = () => {
        try {
            const hash = window.location.hash.slice(1);
            if (!hash) throw new Error('No monitor data found in URL.');
            const compressed = atob(hash).split('').map(c => c.charCodeAt(0));
            const jsonString = pako.inflate(compressed, { to: 'string' });
            monitorData = JSON.parse(jsonString);
            assignedUsers = monitorData.assignedUsers || [];
            return true;
        } catch (error) {
            console.error('Error decoding monitor data:', error);
            monitorTable.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-red-600">Error loading monitor data: ${error.message}</td></tr>`;
            return false;
        }
    };

    const updateMonitorInfo = () => {
        const creationDate = formatDate(monitorData.creationDate);
        const dueDate = formatDate(monitorData.dueDate);
        monitorInfo.textContent = `Monitor created on: ${creationDate} | Due Date: ${dueDate}`;

        if (monitorData.dateRange2) {
            const churnPeriodText = formatPeriodText(monitorData.dateRange2);
            churnPeriodInfo.textContent = `Monitoring users who churned during the period of ${churnPeriodText}.`;
        }
    };

    const updateTimeRemaining = () => {
        const now = new Date();
        const due = new Date(monitorData.dueDate);
        const diffMs = due - now;

        timeRemainingEl.classList.remove('text-red-600', 'text-yellow-600');

        if (diffMs <= 0) {
            timeRemainingEl.textContent = 'Overdue';
            timeRemainingEl.classList.add('text-red-600');
            return;
        }
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        timeRemainingEl.textContent = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
        if (diffDays <= 7) {
            timeRemainingEl.classList.add('text-yellow-600');
        }
    };

    const renderTable = (usersToRender) => {
        monitorTable.innerHTML = '';
        noResults.classList.add('hidden');

        if (usersToRender.length === 0) {
            if (searchInput.value) { // Check if the emptiness is due to a search
                noResults.classList.remove('hidden');
            } else {
                monitorTable.innerHTML = '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No assigned users.</td></tr>';
            }
            return;
        }

        usersToRender.forEach((user, index) => {
            const tr = document.createElement('tr');
            tr.className = 'transition-colors duration-500';

            const isReactivated = user.status === 'Reactivated';
            if (isReactivated) {
                tr.classList.add('reactivated-row');
            }
            
            const statusBadge = isReactivated
                ? `<span class="status-badge status-reactivated">Reactivated</span>`
                : `<span class="status-badge status-churned">Churned</span>`;

            tr.innerHTML = `
                <td class="px-6 py-4 text-sm text-gray-700">${index + 1}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-800">${user['First Name']} ${user['Last Name']}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Phone Number']}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${formatDate(user['Created Date'])}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Store Name'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['LGA'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${user['Store Address'] || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-700 font-semibold">${user.assignedAE}</td>
                <td class="px-6 py-4 text-sm font-medium text-center">${statusBadge}</td>
            `;
            monitorTable.appendChild(tr);
        });
        updateReactivatedCount();
    };

    const handleSearch = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredUsers = assignedUsers.filter(user => {
            const fullName = `${user['First Name']} ${user['Last Name']}`.toLowerCase();
            const phone = (user['Phone Number'] || '').toLowerCase();
            const storeName = (user['Store Name'] || '').toLowerCase();
            const lga = (user['LGA'] || '').toLowerCase();
            const ae = (user.assignedAE || '').toLowerCase();

            return fullName.includes(searchTerm) ||
                   phone.includes(searchTerm) ||
                   storeName.includes(searchTerm) ||
                   lga.includes(searchTerm) ||
                   ae.includes(searchTerm);
        });
        renderTable(filteredUsers);
    };

    const updateReactivatedCount = () => {
        const reactivated = assignedUsers.filter(u => u.status === 'Reactivated').length;
        const total = assignedUsers.length;
        reactivatedCount.textContent = `${reactivated}/${total}`;
        
        const percentage = total > 0 ? (reactivated / total) * 100 : 0;
        reactivatedProgress.style.width = `${percentage}%`;
    };

    const refreshStatuses = async () => {
        if (!monitorData.apiBaseUrl || !monitorData.reactivationStartDate) {
            alert('Missing API configuration. Cannot refresh statuses.');
            return;
        }

        refreshBtn.disabled = true;
        refreshBtnText.textContent = 'Refreshing...';
        refreshIcon.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        try {
            const today = toYYYYMMDD(new Date());
            const retentionEndpoint = monitorData.apiBaseUrl.replace('/churn', '/retention');
            const url = `${retentionEndpoint}?download=retained-user-stats&startDate=${monitorData.reactivationStartDate}&endDate=${today}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
            
            const csvText = await response.text();
            const result = await new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: resolve,
                    error: reject
                });
            });

            const activePhoneNumbers = new Set(result.data.map(row => row['Phone Number']));
            assignedUsers.forEach(user => {
                user.status = activePhoneNumbers.has(user['Phone Number']) ? 'Reactivated' : 'Churned';
            });

            handleSearch(); // Re-render table with search term applied
        } catch (error) {
            console.error('Error refreshing statuses:', error);
            alert(`Failed to refresh statuses: ${error.message}`);
        } finally {
            refreshBtn.disabled = false;
            refreshBtnText.textContent = 'Refresh Status';
            refreshIcon.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
        }
    };

    // Initialization
    if (decodeMonitorData()) {
        updateMonitorInfo();
        updateTimeRemaining();
        renderTable(assignedUsers);

        // Refresh statuses on load
        refreshStatuses();

        // Event Listeners
        refreshBtn.addEventListener('click', refreshStatuses);
        searchInput.addEventListener('input', handleSearch);

        // Update time remaining every minute
        setInterval(updateTimeRemaining, 60000);
    }
});