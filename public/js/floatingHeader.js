export function initFloatingHeaders() {
    const tables = document.querySelectorAll('.order-table table');
    
    tables.forEach(table => {
        const originalHeader = table.querySelector('thead');
        if (!originalHeader) return;

        // Create floating header
        const floatingHeader = document.createElement('table');
        floatingHeader.className = 'floating-header';
        floatingHeader.innerHTML = originalHeader.innerHTML;
        
        // Add the floating header to the document
        document.body.appendChild(floatingHeader);

        // Update floating header column widths to match original
        const updateColumnWidths = () => {
            const originalCells = originalHeader.querySelectorAll('th');
            const floatingCells = floatingHeader.querySelectorAll('th');
            
            originalCells.forEach((cell, index) => {
                if (floatingCells[index]) {
                    floatingCells[index].style.width = `${cell.offsetWidth}px`;
                    // Copy other relevant styles
                    floatingCells[index].style.minWidth = window.getComputedStyle(cell).minWidth;
                    floatingCells[index].className = cell.className;
                }
            });

            // Set table width to match original table
            floatingHeader.style.width = `${table.offsetWidth}px`;
            // Set left position to match table's left position
            const tableRect = table.getBoundingClientRect();
            floatingHeader.style.left = `${tableRect.left}px`;
        };

        // Handle scroll event
        const handleScroll = () => {
            const tableRect = table.getBoundingClientRect();
            const headerRect = originalHeader.getBoundingClientRect();
            const shouldShowFloating = tableRect.top < 88 && tableRect.bottom > 88;

            if (shouldShowFloating) {
                floatingHeader.classList.add('visible');
                updateColumnWidths();
            } else {
                floatingHeader.classList.remove('visible');
            }
        };

        // Add event listeners
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', updateColumnWidths);

        // Initial setup
        updateColumnWidths();
    });
} 