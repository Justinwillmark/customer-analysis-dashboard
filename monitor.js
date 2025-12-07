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
    
    // New DOM Elements for View Modes
    const reactivatedCard = document.getElementById('reactivated-card');
    const timeRemainingCard = document.getElementById('time-remaining-card');
    const viewAsAdminBtn = document.getElementById('view-as-admin-btn');
    const copyAgentLinkBtn = document.getElementById('copy-agent-link-btn');
    const adminLoginOverlay = document.getElementById('admin-login-overlay');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const adminLoginError = document.getElementById('admin-login-error');
    const cancelLoginBtn = document.getElementById('cancel-login-btn');

    // State
    let monitorData = null;
    let assignedUsers = [];
    
    // Check URL parameters for view mode
    const urlParams = new URLSearchParams(window.location.search);
    let isAgentView = urlParams.get('mode') === 'agent';

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

            if (monitorData.u) {
                monitorData.assignedUsers = monitorData.u.map(row => ({
                    'First Name': row[0],
                    'Last Name': row[1],
                    'Phone Number': row[2],
                    'Store Name': row[3],
                    'Store Address': row[4],
                    'LGA': row[5],
                    'Created Date': row[6],
                    'assignedAE': row[7]
                }));
            }

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

    const updateReactivatedCount = (usersSubset) => {
        const reactivated = usersSubset.filter(u => u.status === 'Reactivated').length;
        const total = usersSubset.length;
        reactivatedCount.textContent = `${reactivated}/${total}`;
        
        const percentage = total > 0 ? (reactivated / total) * 100 : 0;
        reactivatedProgress.style.width = `${percentage}%`;
    };

    const renderTable = (usersToRender) => {
        monitorTable.innerHTML = '';
        noResults.classList.add('hidden');

        // VISIBILITY LOGIC:
        if (isAgentView) {
            // In Agent View:
            // 1. If search input is empty, clear table, show placeholder, HIDE reactivated card.
            // 2. If search input is active, show results, SHOW reactivated card for those results.
            if (searchInput.value.trim() === '') {
                 reactivatedCard.classList.add('hidden'); // Hide stats when no search
                 monitorTable.innerHTML = '<tr><td colspan="9" class="px-6 py-12 text-center text-gray-500 italic text-lg">Use the search bar above to find a customer.</td></tr>';
                 return;
            } else {
                 reactivatedCard.classList.remove('hidden'); // Show stats for search results
                 updateReactivatedCount(usersToRender); // Update stats based on SEARCH results
            }
        } else {
            // In Admin View:
            // Always show reactivated card with GLOBAL stats
            reactivatedCard.classList.remove('hidden');
            updateReactivatedCount(assignedUsers); 
        }

        // Standard empty state handling for search results
        if (usersToRender.length === 0) {
            if (searchInput.value) {
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
    };

    const handleSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // In Agent View, if search is empty, logic inside renderTable will handle the clearing and hiding.
        // We pass an empty array or the full list? 
        // We can pass the filtered list. If search is empty, filtered list is everything, 
        // BUT renderTable will check searchInput.value and ignore the list if empty in Agent View.
        
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
            const reactivationStart = new Date(monitorData.reactivationStartDate + 'T00:00:00');
            const startDate = new Date(reactivationStart);
            startDate.setDate(startDate.getDate() - 1); 
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 1); 
            const startDateStr = toYYYYMMDD(startDate);
            const endDateStr = toYYYYMMDD(endDate);
            const retentionEndpoint = monitorData.apiBaseUrl.replace('/churn', '/retention');
            const url = `${retentionEndpoint}?download=retained-user-stats&startDate=${startDateStr}&endDate=${endDateStr}`;
            
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

            handleSearch(); 
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

    const updateViewMode = () => {
        if (isAgentView) {
            // Agent View: 
            // 1. Hide Admin specific controls
            copyAgentLinkBtn.classList.add('hidden');
            viewAsAdminBtn.classList.remove('hidden');
            
            // 2. Hide Reactivated Card (will be shown on search)
            reactivatedCard.classList.add('hidden');
            
            // 3. Ensure Time Remaining is visible
            timeRemainingCard.classList.remove('hidden');
            
            // 4. Clear table initially
            searchInput.value = '';
            renderTable([]);
        } else {
            // Admin View:
            // 1. Show Admin controls
            copyAgentLinkBtn.classList.remove('hidden');
            viewAsAdminBtn.classList.add('hidden');
            
            // 2. Show Reactivated Card (Global stats)
            reactivatedCard.classList.remove('hidden');
            
            // 3. Ensure Time Remaining is visible
            timeRemainingCard.classList.remove('hidden');
            
            // 4. Show all data
            renderTable(assignedUsers);
        }
    };

    // --- Admin Login Logic ---
    viewAsAdminBtn.addEventListener('click', () => {
        adminLoginOverlay.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminLoginError.textContent = '';
        adminPasswordInput.focus();
    });

    const hideAdminLogin = () => {
        adminLoginOverlay.classList.add('hidden');
    };

    cancelLoginBtn.addEventListener('click', hideAdminLogin);
    adminLoginOverlay.addEventListener('click', (e) => {
        if (e.target === adminLoginOverlay) hideAdminLogin();
    });

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === 'fieldwork') {
            isAgentView = false;
            updateViewMode();
            hideAdminLogin();
        } else {
            adminLoginError.textContent = 'Incorrect password.';
            adminPasswordInput.select();
        }
    });

    // --- Copy Agent Link Logic ---
    copyAgentLinkBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'agent');
        navigator.clipboard.writeText(url.toString()).then(() => {
            const originalText = copyAgentLinkBtn.innerHTML;
            copyAgentLinkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
            `;
            copyAgentLinkBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            copyAgentLinkBtn.classList.add('bg-gray-700', 'hover:bg-gray-800');
            
            setTimeout(() => {
                copyAgentLinkBtn.innerHTML = originalText;
                copyAgentLinkBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                copyAgentLinkBtn.classList.remove('bg-gray-700', 'hover:bg-gray-800');
            }, 2000);
        });
    });

    // Initialization
    if (decodeMonitorData()) {
        updateMonitorInfo();
        updateTimeRemaining();
        updateViewMode(); // Set initial view based on URL param

        // Refresh statuses on load
        refreshStatuses();

        // Event Listeners
        refreshBtn.addEventListener('click', refreshStatuses);
        searchInput.addEventListener('input', handleSearch);

        // Update time remaining every minute
        setInterval(updateTimeRemaining, 60000);
    }
});