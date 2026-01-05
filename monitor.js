document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const monitorInfo = document.getElementById('monitor-info');
    const churnPeriodInfo = document.getElementById('churn-period-info');
    const reactivatedCount = document.getElementById('reactivated-count');
    const reactivatedCardTitle = document.getElementById('reactivated-card-title');
    const reactivatedProgress = document.getElementById('reactivated-progress');
    const timeRemainingEl = document.getElementById('time-remaining');
    const monitorTable = document.getElementById('monitor-table');
    const monitorMobileList = document.getElementById('monitor-mobile-list'); 
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

    // Filter Buttons
    const filterBtnReactivation = document.getElementById('filter-btn-ae'); // "For Reactivation"
    const filterBtnOnboarding = document.getElementById('filter-btn-onboarding'); // "Onboarding"
    const filterBtnActivity = document.getElementById('filter-btn-activity'); // "Activity"

    // State
    let monitorData = null;
    let assignedUsers = [];
    
    // Split Data Sets
    let onboardingData = []; // Buffer Range: Creation - 1 Day to Now
    let activityData = [];   // Strict Range: Creation to Now
    let historicalPhoneNumbers = new Set(); // Historical Range: Creation - 360 Days to Creation
    
    let viewMode = 'reactivation'; // 'reactivation' | 'onboarding' | 'activity'
    
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

    const fetchAndParse = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: reject
            });
        });
    };

    const setTableLoadingState = (isLoading, errorMsg = null) => {
        const html = isLoading 
            ? `<tr><td colspan="9" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <svg class="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="font-medium text-lg">Retrieving monitor data...</p>
                    <p class="text-sm mt-2 opacity-75">Fetching user details from source</p>
                </div></td></tr>`
            : (errorMsg ? `<tr><td colspan="9" class="px-6 py-4 text-center text-red-600">${errorMsg}</td></tr>` : '');

        monitorTable.innerHTML = html;
        
        // Also update Mobile loading
        if (isLoading) {
            monitorMobileList.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg class="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading data...</p>
            </div>`;
        } else if (errorMsg) {
            monitorMobileList.innerHTML = `<div class="text-center text-red-600 py-4">${errorMsg}</div>`;
        }
    };

    const hydrateMonitorData = async () => {
        setTableLoadingState(true);

        try {
            const { api, d1, d2, a, aes, due, cr } = monitorData;

            // Normalize URL
            const retentionEndpoint = api.replace('/churn', '/retention');
            
            // Construct URLs for data reconstruction
            const url1 = `${retentionEndpoint}?download=retained-user-stats&startDate=${d1.s}&endDate=${d1.e}`;
            // We fetch P2 just to ensure churn logic holds if needed
            const url2 = `${retentionEndpoint}?download=retained-user-stats&startDate=${d2.s}&endDate=${d2.e}`; 
            const churnUrl = `${retentionEndpoint}?download=churned-users&startDate=${d1.s}&endDate=${d1.e}`;

            // Fetch Data
            const [p1Data, p2Data, churnDetailsData] = await Promise.all([
                fetchAndParse(url1),
                fetchAndParse(url2),
                fetchAndParse(churnUrl)
            ]);

            const churnDetailsMap = new Map(churnDetailsData.map(u => [u['Phone Number'], u]));
            
            // 'a' is the assignment map: [[phoneNumber, aeIndex], ...]
            // Create a map for fast lookup of assigned users
            const assignedMap = new Map(a.map(([phone, aeIdx]) => [phone, aes[aeIdx]]));

            monitorData.assignedUsers = [];

            // Reconstruct the user objects
            assignedMap.forEach((aeName, phone) => {
                // Try to find the user in Period 1 data or Churn Details
                const p1User = p1Data.find(u => u['Phone Number'] === phone);
                const details = churnDetailsMap.get(phone);

                if (p1User || details) {
                    const user = {
                        ...p1User, // Base data
                        ...details, // Enriched data
                        // Explicitly prioritize enriched details if available
                        'First Name': details?.['First Name'] || p1User?.['First Name'] || 'Unknown',
                        'Last Name': details?.['Last Name'] || p1User?.['Last Name'] || '',
                        'Phone Number': phone,
                        'Created Date': details?.['Created Date'] || p1User?.['Created Date'],
                        'Store Name': details?.['Store Name'] || p1User?.['Store Name'] || 'N/A',
                        'Store Address': details?.['Store Address'] || p1User?.['Store Address'] || 'N/A',
                        'LGA': details?.['LGA'] || p1User?.['LGA'] || 'N/A',
                        assignedAE: aeName
                    };
                    monitorData.assignedUsers.push(user);
                }
            });

            assignedUsers = monitorData.assignedUsers;
            
            // Backfill legacy properties so the rest of the app works seamlessly
            monitorData.dateRange2 = { start: d2.s, end: d2.e };
            monitorData.apiBaseUrl = api;
            monitorData.reactivationStartDate = d2.e;
            monitorData.dueDate = due; // Fix for "NaN days"
            monitorData.creationDate = cr; // Fix for missing creation date
            
            return true;
        } catch (error) {
            console.error('Hydration Error:', error);
            setTableLoadingState(false, `Error loading monitor data: ${error.message}`);
            return false;
        }
    };

    const decodeMonitorData = () => {
        try {
            const hash = window.location.hash.slice(1);
            if (!hash) throw new Error('No monitor data found in URL.');
            
            // OPTIMIZED FIX: Convert to Uint8Array directly
            const binaryString = atob(hash);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const jsonString = pako.inflate(bytes, { to: 'string' });
            
            if (!jsonString) {
                throw new Error('Decompression returned empty data.');
            }

            monitorData = JSON.parse(jsonString);

            // Version 2: Compact Link (Requires Hydration)
            if (monitorData.v === 2) {
                return true; 
            }

            // Version 1: Legacy (Full Payload)
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
                assignedUsers = monitorData.assignedUsers || [];
            }
            return true;
        } catch (error) {
            console.error('Error decoding monitor data:', error);
            setTableLoadingState(false, `Error loading monitor data: ${error.message}`);
            return false;
        }
    };

    const updateMonitorInfo = () => {
        const creationDate = formatDate(monitorData.creationDate || monitorData.cr);
        const dueDate = formatDate(monitorData.dueDate);
        monitorInfo.textContent = `Monitor created on: ${creationDate} | Due Date: ${dueDate}`;

        if (monitorData.dateRange2 || monitorData.d2) {
            const range = monitorData.dateRange2 || { start: monitorData.d2.s, end: monitorData.d2.e };
            const churnPeriodText = formatPeriodText(range);
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
        if (viewMode === 'activity' || viewMode === 'onboarding') {
            reactivatedCardTitle.textContent = viewMode === 'onboarding' ? "Total Onboarding" : "Total Active";
            const total = usersSubset.length;
            reactivatedCount.textContent = total;
            reactivatedProgress.style.width = '100%';
        } else {
            // viewMode === 'reactivation' (formerly 'ae'/'monitor')
            reactivatedCardTitle.innerHTML = `Churned Users <sup class="text-red-500 text-[10px] font-bold ml-1" style="font-size: 0.6rem;">Reactivate now!</sup>`;
            
            // Numerator: Count of Churned Users in the filtered list
            const numerator = usersSubset.length;
            
            // Denominator: Total Assigned Users (Overall context)
            const denominator = assignedUsers.length;
            
            // Percentage (Filtered / Total)
            const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
            reactivatedProgress.style.width = `${percentage}%`;

            if (isAgentView) {
                 reactivatedCount.textContent = `${numerator}`;
            } else {
                 reactivatedCount.textContent = `${numerator}/${denominator}`;
            }
        }
    };

    const renderTable = (usersToRender) => {
        monitorTable.innerHTML = '';
        monitorMobileList.innerHTML = ''; // Clear mobile list
        noResults.classList.add('hidden');

        // VISIBILITY LOGIC:
        if (isAgentView) {
             // For any agent view mode, we want the search prompt if empty
            if (searchInput.value.trim() === '') {
                 reactivatedCard.classList.remove('hidden'); 
                 
                 // Handle Counter Logic for Empty State in Agent View
                 if (viewMode === 'reactivation') {
                     reactivatedCardTitle.innerHTML = `Churned Users <sup class="text-red-500 text-[10px] font-bold ml-1" style="font-size: 0.6rem;">Reactivate now!</sup>`;
                     // FIX: Show "--" instead of total churned backlog when no search is active
                     reactivatedCount.textContent = '--'; 
                     reactivatedProgress.style.width = '0%';
                 } else {
                     reactivatedCardTitle.textContent = viewMode === 'onboarding' ? "Total Onboarding" : "Total Active";
                     reactivatedCount.textContent = '0';
                     reactivatedProgress.style.width = '0%';
                 }
                 
                 const emptyMsg = `
                    <tr><td colspan="9" class="px-6 py-12 text-center text-gray-500 italic text-lg">Type in the search bar above to get results.</td></tr>
                 `;
                 monitorTable.innerHTML = emptyMsg;
                 monitorMobileList.innerHTML = `<div class="text-center text-gray-500 py-12 italic text-lg">Type in the search bar above to get results.</div>`;
                 return;
            } else {
                 reactivatedCard.classList.remove('hidden'); 
            }
        } else {
            reactivatedCard.classList.remove('hidden');
        }
        
        // Update stats based on current view logic (when search is active or in Admin view)
        updateReactivatedCount(usersToRender); 

        // Standard empty state handling for search results
        if (usersToRender.length === 0) {
            if (searchInput.value) {
                noResults.classList.remove('hidden');
                monitorMobileList.innerHTML = ''; // No results on mobile too
            } else {
                const noUsersMsg = '<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No data available.</td></tr>';
                monitorTable.innerHTML = noUsersMsg;
                monitorMobileList.innerHTML = `<div class="text-center text-gray-500 py-8">No data available.</div>`;
            }
            return;
        }

        // Render Desktop and Mobile Views
        const fragment = document.createDocumentFragment();
        const mobileFragment = document.createDocumentFragment();

        usersToRender.forEach((user, index) => {
            // 1. Desktop Row
            const tr = document.createElement('tr');
            tr.className = 'transition-colors duration-500';

            // Determine Status Styling
            let statusBadge = '';
            
            if (user.status === 'Onboarding') {
                tr.classList.add('onboarding-row');
                statusBadge = `<span class="status-badge status-onboarding">Onboarding</span>`;
            } else if (user.status === 'Reactivation-based' || user.status === 'Reactivated') {
                tr.classList.add('reactivated-row');
                statusBadge = `<span class="status-badge status-reactivated">${user.status === 'Reactivated' ? 'Reactivated' : 'Reactivation-based'}</span>`;
            } else if (user.status === 'Organic Active') {
                tr.classList.add('onboarded-row'); 
                statusBadge = `<span class="status-badge status-onboarded">Organic Active</span>`;
            } else {
                // Churned
                statusBadge = `<span class="status-badge status-churned">Churned</span>`;
            }

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
            fragment.appendChild(tr);

            // 2. Mobile Card
            const card = document.createElement('div');
            let cardClasses = `bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2`;
            
            if (user.status === 'Onboarding') cardClasses += ' border-purple-200 bg-purple-50';
            else if (user.status === 'Reactivation-based' || user.status === 'Reactivated') cardClasses += ' border-green-200 bg-green-50';
            else if (user.status === 'Organic Active') cardClasses += ' border-blue-200 bg-blue-50';
            
            card.className = cardClasses;
            
            // Format phone number for dialing logic (234 -> 0)
            let dialNumber = user['Phone Number'] || '';
            if (dialNumber.toString().startsWith('234')) {
                dialNumber = '0' + dialNumber.toString().substring(3);
            }

            const phoneLink = user['Phone Number'] 
                ? `<a href="tel:${dialNumber}" class="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Call
                   </a>` 
                : '<span class="text-xs text-gray-400">No Phone</span>';

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="overflow-hidden">
                        <h3 class="font-bold text-gray-900 text-base truncate">${user['First Name']} ${user['Last Name']}</h3>
                        <div class="text-xs text-gray-500 mt-0.5 truncate">${user['Store Name'] || 'No Store Name'}</div>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="grid grid-cols-2 gap-1 text-xs mt-1">
                    <div class="text-gray-500">
                        <span class="block text-[10px] uppercase text-gray-400 font-semibold">LGA</span>
                        ${user['LGA'] || '-'}
                    </div>
                    <div class="text-gray-500">
                         <span class="block text-[10px] uppercase text-gray-400 font-semibold">Last Sale</span>
                         ${formatDate(user['Created Date'])}
                    </div>
                </div>

                <div class="text-xs text-gray-600 border-t border-gray-100 pt-2 mt-1 truncate">
                     ${user['Store Address'] || 'N/A'}
                </div>

                <div class="flex justify-between items-center pt-1 mt-1">
                    ${phoneLink}
                    <div class="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">AE: ${user.assignedAE}</div>
                </div>
            `;
            mobileFragment.appendChild(card);
        });
        
        monitorTable.appendChild(fragment);
        monitorMobileList.appendChild(mobileFragment);
    };

    const handleSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let results = [];
        
        // Helper to check against search term
        const matchesSearch = (user) => {
            const ae = (user.assignedAE || user['Referral Code'] || '').toLowerCase();
            return ae.includes(searchTerm);
        };

        if (viewMode === 'reactivation') {
            // --- 1. Reactivation Mode ---
            // Data Source: assignedUsers (churned list)
            results = assignedUsers.filter(user => {
                // If Reactivated, hide from this list
                if (user.status === 'Reactivated') return false;
                return matchesSearch(user);
            });

        } else if (viewMode === 'onboarding') {
            // --- 2. Onboarding Mode ---
            // Data Source: onboardingData (Buffer Range)
            // Logic: Users in Buffer Range, NOT in Historical, NOT in Churn List (Reactivation)
            
            if (onboardingData.length === 0 && !loadingSpinner.classList.contains('hidden')) return;
            
            const monitoredPhones = new Set(assignedUsers.map(u => u['Phone Number']));

            results = onboardingData.filter(user => {
                const phone = user['Phone Number'];
                
                // If they are historical, they are NOT onboarding (they are existing)
                if (historicalPhoneNumbers.has(phone)) return false;
                
                // If they are on the Churn List, they are Reactivation-based (not Onboarding)
                if (monitoredPhones.has(phone)) return false;
                
                return matchesSearch(user);
            }).map(u => ({
                ...u,
                assignedAE: u['Referral Code'],
                status: 'Onboarding'
            }));

        } else if (viewMode === 'activity') {
            // --- 3. Activity Mode ---
            // Data Source: activityData (Strict Range - No Buffer)
            // Logic: Users in Strict Range. 
            // Classification: Must be either Reactivation-based OR Organic Active.
            // Exclude "Onboarding" type users from this view (i.e. if not historical and not monitored, hide them)

            if (activityData.length === 0 && !loadingSpinner.classList.contains('hidden')) return;

            const monitoredPhones = new Set(assignedUsers.map(u => u['Phone Number']));

            results = activityData.filter(user => {
                const phone = user['Phone Number'];
                const isHistorical = historicalPhoneNumbers.has(phone);
                const isMonitored = monitoredPhones.has(phone);
                
                // If neither historical nor monitored, they are effectively "Onboarding" (New)
                // We exclude New users from the Activity tab
                if (!isHistorical && !isMonitored) return false;

                return matchesSearch(user);
            }).map(user => {
                const isMonitored = monitoredPhones.has(user['Phone Number']);
                return {
                    ...user,
                    assignedAE: user['Referral Code'],
                    status: isMonitored ? 'Reactivation-based' : 'Organic Active'
                };
            });
        }
        
        renderTable(results);
    };

    // Filter Button Logic
    const updateFilterButtons = () => {
        const setActive = (btn) => {
            btn.className = "flex-1 px-0 py-1 sm:px-4 sm:py-2 text-[10px] tracking-tight sm:text-sm font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-md bg-blue-600 text-white border border-transparent sm:tracking-wide hover:bg-blue-700 flex items-center justify-center gap-1";
        };

        const setInactive = (btn) => {
            btn.className = "flex-1 px-0 py-1 sm:px-4 sm:py-2 text-[10px] tracking-tight sm:text-sm font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 sm:tracking-wide flex items-center justify-center gap-1";
        };

        if (viewMode === 'activity') {
            setInactive(filterBtnReactivation);
            setInactive(filterBtnOnboarding);
            setActive(filterBtnActivity);
        } else if (viewMode === 'onboarding') {
            setInactive(filterBtnReactivation);
            setActive(filterBtnOnboarding);
            setInactive(filterBtnActivity);
        } else {
            // Reactivation
            setActive(filterBtnReactivation);
            setInactive(filterBtnOnboarding);
            setInactive(filterBtnActivity);
        }
    };

    filterBtnReactivation.addEventListener('click', () => {
        viewMode = 'reactivation';
        updateFilterButtons();
        handleSearch();
    });

    filterBtnOnboarding.addEventListener('click', () => {
        viewMode = 'onboarding';
        updateFilterButtons();
        // Trigger data processing if needed
        handleSearch();
    });

    filterBtnActivity.addEventListener('click', () => {
        viewMode = 'activity';
        updateFilterButtons();
        handleSearch();
    });

    const refreshStatuses = async () => {
        const apiBase = monitorData.apiBaseUrl || monitorData.api;
        
        let startDateVal = monitorData.creationDate || monitorData.cr || monitorData.reactivationStartDate || (monitorData.d2 ? monitorData.d2.e : null);
        
        if (!apiBase || !startDateVal) {
            alert('Missing API configuration or start date. Cannot refresh statuses.');
            return;
        }

        refreshBtn.disabled = true;
        refreshBtnText.textContent = 'Refreshing...';
        refreshIcon.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        try {
            const retentionEndpoint = apiBase.replace('/churn', '/retention');
            
            // Dates
            const monitorCreationDate = new Date(startDateVal);
            
            // 1. Buffer Range Start (for Onboarding) - Includes 1 day buffer
            const dateBufferStart = new Date(monitorCreationDate);
            dateBufferStart.setDate(dateBufferStart.getDate() - 1);
            
            // 2. Strict Range Start (for Activity) - No buffer
            const dateStrictStart = new Date(monitorCreationDate);
            
            // 3. Historical Range (360 days before creation)
            const dateHistoricalStart = new Date(monitorCreationDate);
            dateHistoricalStart.setDate(dateHistoricalStart.getDate() - 360);
            const dateHistoricalEnd = new Date(monitorCreationDate);

            // Shared End Date (Today + 1 day buffer)
            let limitDate = new Date(); 
            if (monitorData.dueDate) {
                const parts = monitorData.dueDate.split('-');
                if (parts.length === 3) {
                    const dueEnd = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    dueEnd.setHours(23, 59, 59, 999);
                    if (limitDate > dueEnd) {
                        limitDate = dueEnd;
                    }
                }
            }
            const currentEndDate = new Date(limitDate);
            currentEndDate.setDate(currentEndDate.getDate() + 1); 

            // Construct URLs
            const urlOnboarding = `${retentionEndpoint}?download=retained-user-stats&startDate=${toYYYYMMDD(dateBufferStart)}&endDate=${toYYYYMMDD(currentEndDate)}`;
            const urlActivity = `${retentionEndpoint}?download=retained-user-stats&startDate=${toYYYYMMDD(dateStrictStart)}&endDate=${toYYYYMMDD(currentEndDate)}`;
            const urlHistorical = `${retentionEndpoint}?download=retained-user-stats&startDate=${toYYYYMMDD(dateHistoricalStart)}&endDate=${toYYYYMMDD(dateHistoricalEnd)}`;
            
            // Fetch All
            const [resOnboarding, resActivity, resHistorical] = await Promise.all([
                fetchAndParse(urlOnboarding),
                fetchAndParse(urlActivity),
                fetchAndParse(urlHistorical)
            ]);
            
            // Store Data
            onboardingData = resOnboarding;
            activityData = resActivity;
            historicalPhoneNumbers = new Set(resHistorical.map(u => u['Phone Number']));

            // Update "Assigned Users" (Reactivation) Logic
            // We use the STRICT activity data to determine if a user has reactivated
            // (i.e., they must be active ON or AFTER the monitor creation date)
            const activePhonesStrict = new Set(activityData.map(row => row['Phone Number']));
            assignedUsers.forEach(user => {
                user.status = activePhonesStrict.has(user['Phone Number']) ? 'Reactivated' : 'Churned';
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
            copyAgentLinkBtn.classList.add('hidden');
            viewAsAdminBtn.classList.remove('hidden');
            timeRemainingCard.classList.remove('hidden'); 
            searchInput.value = '';
            // Don't render empty table immediately, let handleSearch decide
            renderTable([]);
        } else {
            copyAgentLinkBtn.classList.remove('hidden');
            viewAsAdminBtn.classList.add('hidden');
            reactivatedCard.classList.remove('hidden');
            timeRemainingCard.classList.remove('hidden');
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
        // If V2, we need to hydrate data first
        if (monitorData.v === 2) {
            hydrateMonitorData().then(success => {
                if (success) {
                    updateMonitorInfo();
                    updateTimeRemaining();
                    updateViewMode(); 
                    refreshStatuses();
                    setInterval(updateTimeRemaining, 60000);
                }
            });
        } else {
            // Legacy load
            updateMonitorInfo();
            updateTimeRemaining();
            updateViewMode(); 
            refreshStatuses();
            setInterval(updateTimeRemaining, 60000);
        }

        // Event Listeners
        refreshBtn.addEventListener('click', refreshStatuses);
        searchInput.addEventListener('input', handleSearch);
    }
});