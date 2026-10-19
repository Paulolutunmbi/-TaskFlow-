/**
 * TaskFlow Frontend Application
 * Lightweight Vanilla JavaScript Controller
 */

(() => {
  'use strict';

  // --- State ---
  const state = {
    tasks: [],
    filterStatus: 'all',
    filterPriority: 'all',
    searchQuery: '',
    sortBy: 'newest',
    isLoading: false,
    taskToDelete: null,
    taskToEdit: null
  };

  // --- DOM Elements ---
  const el = {
    // Health & Header
    healthPill: document.getElementById('healthPill'),
    refreshBtn: document.getElementById('refreshBtn'),

    // Stats
    statTotal: document.getElementById('statTotal'),
    statTodo: document.getElementById('statTodo'),
    statInProgress: document.getElementById('statInProgress'),
    statCompleted: document.getElementById('statCompleted'),
    statCards: document.querySelectorAll('.stat-card'),

    // Create Form
    createForm: document.getElementById('createTaskForm'),
    taskTitle: document.getElementById('taskTitle'),
    taskDesc: document.getElementById('taskDesc'),
    taskPriority: document.getElementById('taskPriority'),
    taskStatus: document.getElementById('taskStatus'),
    createSubmitBtn: document.getElementById('createSubmitBtn'),
    titleError: document.getElementById('titleError'),
    descError: document.getElementById('descError'),
    titleCharCount: document.getElementById('titleCharCount'),
    descCharCount: document.getElementById('descCharCount'),

    // Toolbar & Filtering
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    priorityFilter: document.getElementById('priorityFilter'),
    sortSelector: document.getElementById('sortSelector'),
    statusTabs: document.querySelectorAll('.status-tab'),
    tabCountAll: document.getElementById('tabCountAll'),
    tabCountTodo: document.getElementById('tabCountTodo'),
    tabCountInProgress: document.getElementById('tabCountInProgress'),
    tabCountCompleted: document.getElementById('tabCountCompleted'),
    filterSummaryBar: document.getElementById('filterSummaryBar'),
    filterSummaryText: document.getElementById('filterSummaryText'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),

    // Task List & States
    taskList: document.getElementById('taskList'),
    taskListLoading: document.getElementById('taskListLoading'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyDesc: document.getElementById('emptyDesc'),
    emptyActionBtn: document.getElementById('emptyActionBtn'),

    // Edit Modal
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editTaskForm'),
    editTaskId: document.getElementById('editTaskId'),
    editTaskTitle: document.getElementById('editTaskTitle'),
    editTaskDesc: document.getElementById('editTaskDesc'),
    editTaskPriority: document.getElementById('editTaskPriority'),
    editTaskStatus: document.getElementById('editTaskStatus'),
    editTitleError: document.getElementById('editTitleError'),
    editDescError: document.getElementById('editDescError'),
    editTitleCharCount: document.getElementById('editTitleCharCount'),
    editDescCharCount: document.getElementById('editDescCharCount'),
    closeEditModalBtn: document.getElementById('closeEditModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    deleteTaskTitlePreview: document.getElementById('deleteTaskTitlePreview'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Helpers ---
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info: `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    toast.innerHTML = `
      ${iconMap[type] || iconMap.info}
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => toast.remove());

    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  // --- API Client ---
  async function apiCheckHealth() {
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      el.healthPill.classList.remove('error');
      el.healthPill.classList.add('healthy');
      el.healthPill.querySelector('.status-label').textContent = `System: ${data.status.toUpperCase()} (${data.uptime})`;
      el.healthPill.title = `TaskFlow v${data.version} online | Uptime: ${data.uptime}`;
    } catch (err) {
      el.healthPill.classList.remove('healthy');
      el.healthPill.classList.add('error');
      el.healthPill.querySelector('.status-label').textContent = 'System: Unreachable';
      el.healthPill.title = 'Health check failed';
    }
  }

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch tasks (HTTP ${res.status})`);
      }
      state.tasks = await res.json();
      render();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createTask(payload) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }
      state.tasks.unshift(data);
      render();
      showToast(`Task "${data.title}" added successfully`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }

  async function updateTask(id, updates) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update task');
      }

      const index = state.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        state.tasks[index] = data;
      }
      render();
      showToast('Task updated successfully', 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }

  async function deleteTask(id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete task');
      }

      state.tasks = state.tasks.filter(t => t.id !== id);
      render();
      showToast('Task deleted', 'info');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }

  // --- Rendering & UI Updates ---
  function setLoading(isLoading) {
    state.isLoading = isLoading;
    if (isLoading) {
      el.taskListLoading.hidden = false;
      el.taskList.style.opacity = '0.5';
    } else {
      el.taskListLoading.hidden = true;
      el.taskList.style.opacity = '1';
    }
  }

  function updateMetrics() {
    const total = state.tasks.length;
    const todo = state.tasks.filter(t => t.status === 'todo').length;
    const inProgress = state.tasks.filter(t => t.status === 'in-progress').length;
    const completed = state.tasks.filter(t => t.status === 'completed').length;

    el.statTotal.textContent = total;
    el.statTodo.textContent = todo;
    el.statInProgress.textContent = inProgress;
    el.statCompleted.textContent = completed;

    el.tabCountAll.textContent = total;
    el.tabCountTodo.textContent = todo;
    el.tabCountInProgress.textContent = inProgress;
    el.tabCountCompleted.textContent = completed;
  }

  function getFilteredAndSortedTasks() {
    let result = [...state.tasks];

    // Status Filter
    if (state.filterStatus !== 'all') {
      result = result.filter(t => t.status === state.filterStatus);
    }

    // Priority Filter
    if (state.filterPriority !== 'all') {
      result = result.filter(t => t.priority === state.filterPriority);
    }

    // Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    switch (state.sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'priority':
        result.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return result;
  }

  function render() {
    updateMetrics();

    // Update Tab active classes
    el.statusTabs.forEach(tab => {
      const tabStatus = tab.dataset.status;
      const isActive = tabStatus === state.filterStatus;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Filter Summary Bar
    const hasActiveFilters =
      state.filterStatus !== 'all' ||
      state.filterPriority !== 'all' ||
      Boolean(state.searchQuery.trim());

    if (hasActiveFilters) {
      el.filterSummaryBar.hidden = false;
      const parts = [];
      if (state.filterStatus !== 'all') parts.push(`Status: ${state.filterStatus}`);
      if (state.filterPriority !== 'all') parts.push(`Priority: ${state.filterPriority}`);
      if (state.searchQuery.trim()) parts.push(`Keyword: "${state.searchQuery.trim()}"`);
      el.filterSummaryText.textContent = `Active filters: ${parts.join(', ')}`;
    } else {
      el.filterSummaryBar.hidden = true;
    }

    // Filter and Sort Tasks
    const visibleTasks = getFilteredAndSortedTasks();

    // Render List or Empty State
    if (visibleTasks.length === 0) {
      el.taskList.innerHTML = '';
      el.emptyState.hidden = false;

      if (state.tasks.length === 0) {
        el.emptyTitle.textContent = 'No tasks created yet';
        el.emptyDesc.textContent = 'Get started by creating your first task using the form on the left.';
        el.emptyActionBtn.hidden = true;
      } else {
        el.emptyTitle.textContent = 'No tasks match criteria';
        el.emptyDesc.textContent = 'Try resetting your filters or adjusting your search term.';
        el.emptyActionBtn.hidden = false;
        el.emptyActionBtn.textContent = 'Clear all filters';
      }
      return;
    }

    el.emptyState.hidden = true;

    el.taskList.innerHTML = visibleTasks
      .map(task => {
        const isCompleted = task.status === 'completed';
        const formattedDate = formatDate(task.createdAt);

        return `
          <article class="task-card ${isCompleted ? 'task-completed' : ''}" data-id="${task.id}">
            <div class="task-check-wrapper">
              <input
                type="checkbox"
                class="task-checkbox toggle-complete-btn"
                ${isCompleted ? 'checked' : ''}
                aria-label="Toggle task status"
                title="${isCompleted ? 'Mark as To Do' : 'Mark as Completed'}"
              >
            </div>

            <div class="task-card-content">
              <div class="task-card-header">
                <div class="task-title-group">
                  <h3 class="task-title">${escapeHtml(task.title)}</h3>
                </div>
                <div class="badge-group">
                  <span class="badge badge-priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
                  <span class="badge badge-status-${escapeHtml(task.status)}">${escapeHtml(task.status.replace('-', ' '))}</span>
                </div>
              </div>

              ${
                task.description
                  ? `<p class="task-description">${escapeHtml(task.description)}</p>`
                  : ''
              }

              <div class="task-card-footer">
                <span class="task-timestamp" title="Created on ${task.createdAt}">Created: ${formattedDate}</span>
                <div class="task-actions">
                  <button type="button" class="btn btn-secondary btn-sm edit-task-btn" aria-label="Edit task">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm btn-icon-only delete-task-btn" aria-label="Delete task" title="Delete task">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // --- Modal Logic ---
  function openEditModal(task) {
    state.taskToEdit = task;
    el.editTaskId.value = task.id;
    el.editTaskTitle.value = task.title;
    el.editTaskDesc.value = task.description || '';
    el.editTaskPriority.value = task.priority;
    el.editTaskStatus.value = task.status;

    el.editTitleError.textContent = '';
    el.editDescError.textContent = '';
    el.editTaskTitle.classList.remove('input-error');
    el.editTitleCharCount.textContent = `${task.title.length}/100`;
    el.editDescCharCount.textContent = `${(task.description || '').length}/500`;

    el.editModal.hidden = false;
    el.editTaskTitle.focus();
  }

  function closeEditModal() {
    el.editModal.hidden = true;
    state.taskToEdit = null;
  }

  function openDeleteModal(task) {
    state.taskToDelete = task;
    el.deleteTaskTitlePreview.textContent = task.title;
    el.deleteModal.hidden = false;
    el.cancelDeleteBtn.focus();
  }

  function closeDeleteModal() {
    el.deleteModal.hidden = true;
    state.taskToDelete = null;
  }

  function resetAllFilters() {
    state.filterStatus = 'all';
    state.filterPriority = 'all';
    state.searchQuery = '';
    state.sortBy = 'newest';

    el.searchInput.value = '';
    el.clearSearchBtn.hidden = true;
    el.priorityFilter.value = 'all';
    el.sortSelector.value = 'newest';

    render();
  }

  // --- Event Listeners Setup ---
  function initEventListeners() {
    // Health polling & Refresh button
    apiCheckHealth();
    setInterval(apiCheckHealth, 30000);
    el.refreshBtn.addEventListener('click', () => {
      fetchTasks();
      apiCheckHealth();
      showToast('Dashboard refreshed', 'info');
    });

    // Stat Cards click to filter
    el.statCards.forEach(card => {
      const handleStatClick = () => {
        const filter = card.dataset.filter;
        state.filterStatus = filter;
        render();
      };
      card.addEventListener('click', handleStatClick);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStatClick();
        }
      });
    });

    // Status Tabs click to filter
    el.statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        state.filterStatus = tab.dataset.status;
        render();
      });
    });

    // Priority filter dropdown
    el.priorityFilter.addEventListener('change', e => {
      state.filterPriority = e.target.value;
      render();
    });

    // Sort selector dropdown
    el.sortSelector.addEventListener('change', e => {
      state.sortBy = e.target.value;
      render();
    });

    // Search input
    el.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      el.clearSearchBtn.hidden = !e.target.value;
      render();
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.clearSearchBtn.hidden = true;
      el.searchInput.focus();
      render();
    });

    // Reset filters buttons
    el.resetFiltersBtn.addEventListener('click', resetAllFilters);
    el.emptyActionBtn.addEventListener('click', resetAllFilters);

    // Character counter & real-time validation on Create Form
    el.taskTitle.addEventListener('input', e => {
      const len = e.target.value.length;
      el.titleCharCount.textContent = `${len}/100`;
      if (len > 0) {
        el.titleError.textContent = '';
        el.taskTitle.classList.remove('input-error');
      }
    });

    el.taskDesc.addEventListener('input', e => {
      const len = e.target.value.length;
      el.descCharCount.textContent = `${len}/500`;
    });

    // Character counter & validation on Edit Form
    el.editTaskTitle.addEventListener('input', e => {
      const len = e.target.value.length;
      el.editTitleCharCount.textContent = `${len}/100`;
      if (len > 0) {
        el.editTitleError.textContent = '';
        el.editTaskTitle.classList.remove('input-error');
      }
    });

    el.editTaskDesc.addEventListener('input', e => {
      const len = e.target.value.length;
      el.editDescCharCount.textContent = `${len}/500`;
    });

    // Create Form Submit
    el.createForm.addEventListener('submit', async e => {
      e.preventDefault();
      const title = el.taskTitle.value.trim();
      const description = el.taskDesc.value.trim();
      const priority = el.taskPriority.value;
      const status = el.taskStatus.value;

      if (!title) {
        el.titleError.textContent = 'Please enter a task title.';
        el.taskTitle.classList.add('input-error');
        el.taskTitle.focus();
        return;
      }

      el.createSubmitBtn.disabled = true;
      const success = await createTask({ title, description, priority, status });
      el.createSubmitBtn.disabled = false;

      if (success) {
        el.createForm.reset();
        el.titleCharCount.textContent = '0/100';
        el.descCharCount.textContent = '0/500';
        el.taskPriority.value = 'medium';
        el.taskStatus.value = 'todo';
      }
    });

    // Task List Delegated Events (Complete toggle, Edit, Delete)
    el.taskList.addEventListener('click', e => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      const id = Number(card.dataset.id);
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;

      // Toggle Complete Checkbox
      if (e.target.closest('.toggle-complete-btn')) {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        updateTask(id, { status: newStatus });
        return;
      }

      // Edit Button
      if (e.target.closest('.edit-task-btn')) {
        openEditModal(task);
        return;
      }

      // Delete Button
      if (e.target.closest('.delete-task-btn')) {
        openDeleteModal(task);
        return;
      }
    });

    // Edit Modal Events
    el.closeEditModalBtn.addEventListener('click', closeEditModal);
    el.cancelEditBtn.addEventListener('click', closeEditModal);

    el.editForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!state.taskToEdit) return;

      const title = el.editTaskTitle.value.trim();
      const description = el.editTaskDesc.value.trim();
      const priority = el.editTaskPriority.value;
      const status = el.editTaskStatus.value;

      if (!title) {
        el.editTitleError.textContent = 'Please enter a task title.';
        el.editTaskTitle.classList.add('input-error');
        el.editTaskTitle.focus();
        return;
      }

      el.saveEditBtn.disabled = true;
      const success = await updateTask(state.taskToEdit.id, {
        title,
        description,
        priority,
        status
      });
      el.saveEditBtn.disabled = false;

      if (success) {
        closeEditModal();
      }
    });

    // Delete Modal Events
    el.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    el.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    el.confirmDeleteBtn.addEventListener('click', async () => {
      if (!state.taskToDelete) return;
      el.confirmDeleteBtn.disabled = true;
      const success = await deleteTask(state.taskToDelete.id);
      el.confirmDeleteBtn.disabled = false;
      if (success) {
        closeDeleteModal();
      }
    });

    // Global Keydown for Modals (ESC to close)
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!el.editModal.hidden) closeEditModal();
        if (!el.deleteModal.hidden) closeDeleteModal();
      }
    });

    // Modal click outside to dismiss
    el.editModal.addEventListener('click', e => {
      if (e.target === el.editModal) closeEditModal();
    });

    el.deleteModal.addEventListener('click', e => {
      if (e.target === el.deleteModal) closeDeleteModal();
    });
  }

  // --- Initialize App ---
  function init() {
    initEventListeners();
    fetchTasks();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
