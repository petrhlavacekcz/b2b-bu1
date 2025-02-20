let categories = [];
let visibleCategories = new Set();
let originalCategories = []; // Store original order

export function initializeCategories(fetchedCategories) {
    categories = fetchedCategories;
    originalCategories = [...fetchedCategories]; // Keep original order
    // Initially, all categories are visible
    visibleCategories = new Set(categories.map(cat => cat.category_id));
    renderCategories();
    setupDragAndDrop();
    updateCategoryVisibility(); // Make sure visibility is applied initially
}

function renderCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;

    categoriesList.innerHTML = categories.map(category => `
        <div class="category-item flex items-center justify-between p-2 bg-white border rounded-md hover:bg-gray-50" 
             draggable="true" 
             data-category-id="${category.category_id}">
            <div class="flex items-center space-x-3">
                <input type="checkbox" 
                       class="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300"
                       ${visibleCategories.has(category.category_id) ? 'checked' : ''}
                       data-category-id="${category.category_id}">
                <span class="text-sm text-gray-700">${category.name}</span>
            </div>
            <div class="drag-handle text-gray-400 cursor-move">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="6" r="2"/>
                    <circle cx="10" cy="10" r="2"/>
                    <circle cx="10" cy="14" r="2"/>
                </svg>
            </div>
        </div>
    `).join('');

    // Add checkbox event listeners
    categoriesList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCategoryToggle);
    });
}

function setupDragAndDrop() {
    const categoriesList = document.getElementById('categoriesList');
    let draggedItem = null;

    categoriesList.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.category-item');
        if (!item) return;
        
        draggedItem = item;
        draggedItem.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.categoryId);
    });

    categoriesList.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('opacity-50');
            draggedItem = null;
        }
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('border-t-2', 'border-b-2', 'border-blue-500');
        });
    });

    categoriesList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.category-item');
        if (!targetItem || targetItem === draggedItem) return;

        const boundingRect = targetItem.getBoundingClientRect();
        const offset = boundingRect.y + (boundingRect.height / 2);

        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('border-t-2', 'border-b-2', 'border-blue-500');
        });

        if (e.clientY - offset > 0) {
            targetItem.classList.add('border-b-2', 'border-blue-500');
        } else {
            targetItem.classList.add('border-t-2', 'border-blue-500');
        }
    });

    categoriesList.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.category-item');
        if (!draggedItem || !targetItem || targetItem === draggedItem) return;

        const boundingRect = targetItem.getBoundingClientRect();
        const offset = boundingRect.y + (boundingRect.height / 2);

        if (e.clientY - offset > 0) {
            targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
        } else {
            targetItem.parentNode.insertBefore(draggedItem, targetItem);
        }

        updateCategoryOrder();
    });
}

function handleCategoryToggle(e) {
    const categoryId = e.target.dataset.categoryId;
    if (e.target.checked) {
        visibleCategories.add(categoryId);
    } else {
        visibleCategories.delete(categoryId);
    }
    updateCategoryVisibility();
}

function updateCategoryOrder() {
    // Get the new order from the DOM
    const newOrder = Array.from(document.querySelectorAll('.category-item'))
        .map(item => categories.find(cat => cat.category_id === item.dataset.categoryId))
        .filter(Boolean);

    // Update the categories array with the new order
    categories = newOrder;

    // Reorder the actual category containers in the main content
    const tablesContainer = document.getElementById('tablesContainer');
    if (!tablesContainer) return;

    const fragment = document.createDocumentFragment();
    categories.forEach(cat => {
        const categoryElement = document.getElementById(`category_${cat.category_id}`);
        if (categoryElement && categoryElement.parentNode === tablesContainer) {
            fragment.appendChild(categoryElement);
        }
    });

    tablesContainer.appendChild(fragment);
}

export function updateCategoryVisibility() {
    document.querySelectorAll('.category-container').forEach(container => {
        const categoryId = container.id.replace('category_', '');
        container.style.display = visibleCategories.has(categoryId) ? 'block' : 'none';
    });
}

export function resetCategories() {
    categories = [...originalCategories];
    visibleCategories = new Set(categories.map(cat => cat.category_id));
    renderCategories();
    updateCategoryVisibility();
    updateCategoryOrder();
} 