// Import types (we'll need to compile this to JS)
interface SavedPage {
    _id?: string;
    url: string;
    title: string;
    timestamp: number;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Dashboard class - this is a TypeScript class
class Dashboard {
    private currentPage: number = 1;
    private pageSize: number = 10;
    private totalPages: number = 0;
    private allPages: SavedPage[] = [];
    private filteredPages: SavedPage[] = [];

    constructor() {
        this.initializeEventListeners();
        this.loadUserInfo();
        this.loadPages();
    }

    // Private method - only accessible within the class
    private initializeEventListeners(): void {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const domainFilter = document.getElementById('domain-filter') as HTMLSelectElement;
        const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
        const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

        // Event listeners with proper typing
        searchInput?.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            this.filterPages(target.value);
        });

        domainFilter?.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLSelectElement;
            this.filterByDomain(target.value);
        });

        exportBtn?.addEventListener('click', () => this.exportPages());
        logoutBtn?.addEventListener('click', () => this.logout());
    }

    // Async method with proper error handling
    private async loadPages(): Promise<void> {
        try {
            const response = await fetch('/api/pages');
            const result: ApiResponse<SavedPage[]> = await response.json();
            
            if (result.success && result.data) {
                this.allPages = result.data;
                this.filteredPages = [...this.allPages];
                this.updateStats();
                this.renderPages();
                this.populateDomainFilter();
            } else {
                throw new Error(result.error || 'Failed to load pages');
            }
        } catch (error) {
            console.error('Error loading pages:', error);
            this.showError('Failed to load pages');
        }
    }

    // Method with generics and type guards
    private filterPages(searchTerm: string): void {
        if (!searchTerm.trim()) {
            this.filteredPages = [...this.allPages];
        } else {
            this.filteredPages = this.allPages.filter(page => 
                page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                page.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (page.description && page.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        this.currentPage = 1;
        this.renderPages();
    }

    private filterByDomain(domain: string): void {
        if (!domain) {
            this.filteredPages = [...this.allPages];
        } else {
            this.filteredPages = this.allPages.filter(page => 
                new URL(page.url).hostname === domain
            );
        }
        this.currentPage = 1;
        this.renderPages();
    }

    private updateStats(): void {
        const totalPages = this.allPages.length;
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const weekPages = this.allPages.filter(page => page.timestamp > weekAgo).length;
        const uniqueDomains = new Set(this.allPages.map(page => new URL(page.url).hostname)).size;

        // Update DOM elements with proper type checking
        this.updateElement('total-pages', totalPages.toString());
        this.updateElement('week-pages', weekPages.toString());
        this.updateElement('unique-domains', uniqueDomains.toString());
    }

    // Utility method with type safety
    private updateElement(id: string, value: string): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    private renderPages(): void {
        const pagesList = document.getElementById('pages-list');
        if (!pagesList) return;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pagesToShow = this.filteredPages.slice(startIndex, endIndex);

        pagesList.innerHTML = pagesToShow.map(page => this.createPageCard(page)).join('');
        this.renderPagination();
    }

    // Method that returns a string (template literal)
    private createPageCard(page: SavedPage): string {
        const domain = new URL(page.url).hostname;
        const date = new Date(page.timestamp).toLocaleDateString();
        
        return `
            <div class="page-card" data-id="${page._id}">
                <div class="page-header">
                    <h3 class="page-title">${this.escapeHtml(page.title)}</h3>
                    <div class="page-actions">
                        <button class="btn btn-small" onclick="window.open('${page.url}', '_blank')">Open</button>
                        <button class="btn btn-small btn-danger" onclick="dashboard.deletePage('${page._id}')">Delete</button>
                    </div>
                </div>
                <p class="page-url">${this.escapeHtml(page.url)}</p>
                <div class="page-meta">
                    <span class="domain">${domain}</span>
                    <span class="date">${date}</span>
                </div>
                ${page.description ? `<p class="page-description">${this.escapeHtml(page.description)}</p>` : ''}
            </div>
        `;
    }

    // Security method to prevent XSS
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private renderPagination(): void {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        this.totalPages = Math.ceil(this.filteredPages.length / this.pageSize);
        
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="btn btn-small" onclick="dashboard.goToPage(${this.currentPage - 1})">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            const isActive = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-small ${isActive}" onclick="dashboard.goToPage(${i})">${i}</button>`;
        }
        
        // Next button
        if (this.currentPage < this.totalPages) {
            paginationHTML += `<button class="btn btn-small" onclick="dashboard.goToPage(${this.currentPage + 1})">Next</button>`;
        }
        
        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }

    // Public methods (accessible from HTML onclick)
    public goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.renderPages();
        }
    }

    public async deletePage(pageId: string): Promise<void> {
        if (!confirm('Are you sure you want to delete this page?')) return;

        try {
            const response = await fetch(`/api/pages/${pageId}`, {
                method: 'DELETE'
            });
            
            const result: ApiResponse = await response.json();
            
            if (result.success) {
                this.allPages = this.allPages.filter(page => page._id !== pageId);
                this.filteredPages = this.filteredPages.filter(page => page._id !== pageId);
                this.updateStats();
                this.renderPages();
                this.showSuccess('Page deleted successfully');
            } else {
                throw new Error(result.error || 'Failed to delete page');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showError('Failed to delete page');
        }
    }

    private exportPages(): void {
        const dataStr = JSON.stringify(this.filteredPages, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `saved-pages-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Load user information
    private async loadUserInfo(): Promise<void> {
        try {
            const response = await fetch('/api/user');
            const result: ApiResponse<{id: string, name: string, email: string}> = await response.json();
            
            if (result.success && result.data) {
                this.updateElement('user-name', result.data.name);
                this.updateElement('user-email', result.data.email);
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    private logout(): void {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/logout';
        }
    }

    private showError(message: string): void {
        // Simple error display - you could enhance this
        alert(`Error: ${message}`);
    }

    private showSuccess(message: string): void {
        // Simple success display - you could enhance this
        alert(`Success: ${message}`);
    }

    private populateDomainFilter(): void {
        const domainFilter = document.getElementById('domain-filter') as HTMLSelectElement;
        if (!domainFilter) return;

        const domains = [...new Set(this.allPages.map(page => new URL(page.url).hostname))];
        
        // Clear existing options except the first one
        domainFilter.innerHTML = '<option value="">All Domains</option>';
        
        domains.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain;
            option.textContent = domain;
            domainFilter.appendChild(option);
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make dashboard globally accessible for onclick handlers
    (window as any).dashboard = new Dashboard();
});