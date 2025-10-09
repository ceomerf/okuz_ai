describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should redirect to login page when not authenticated', () => {
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
  });

  it('should login with valid credentials', () => {
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').type('admin@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Geçersiz');
  });

  it('should logout successfully', () => {
    // First login
    cy.login('admin@example.com', 'password123');
    
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    cy.url().should('include', '/login');
  });

  it('should maintain session on page refresh', () => {
    cy.login('admin@example.com', 'password123');
    
    cy.reload();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard"]').should('be.visible');
  });
});

describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
  });

  it('should display dashboard after login', () => {
    cy.get('[data-testid="dashboard"]').should('be.visible');
    cy.get('[data-testid="sidebar"]').should('be.visible');
  });

  it('should navigate to students page', () => {
    cy.get('[data-testid="students-menu"]').click();
    cy.url().should('include', '/dynamic/students');
    cy.get('[data-testid="students-table"]').should('be.visible');
  });

  it('should navigate to teachers page', () => {
    cy.get('[data-testid="teachers-menu"]').click();
    cy.url().should('include', '/dynamic/teachers');
    cy.get('[data-testid="teachers-table"]').should('be.visible');
  });
});

describe('Dynamic Entity Management E2E Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
  });

  it('should add new student', () => {
    cy.visit('/dynamic/students');
    
    cy.get('[data-testid="add-student-button"]').click();
    cy.get('[data-testid="student-form"]').should('be.visible');
    
    cy.get('[data-testid="first-name-input"]').type('John');
    cy.get('[data-testid="last-name-input"]').type('Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="grade-input"]').type('9');
    
    cy.get('[data-testid="save-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="students-table"]').should('contain', 'John Doe');
  });

  it('should edit existing student', () => {
    cy.visit('/dynamic/students');
    
    // Assuming there's at least one student
    cy.get('[data-testid="edit-student-button"]').first().click();
    cy.get('[data-testid="student-form"]').should('be.visible');
    
    cy.get('[data-testid="first-name-input"]').clear().type('Jane');
    cy.get('[data-testid="save-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="students-table"]').should('contain', 'Jane');
  });

  it('should delete student', () => {
    cy.visit('/dynamic/students');
    
    cy.get('[data-testid="delete-student-button"]').first().click();
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
});

describe('Dashboard Widget E2E Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
  });

  it('should create new dashboard', () => {
    cy.visit('/dashboard');
    
    cy.get('[data-testid="create-dashboard-button"]').click();
    cy.get('[data-testid="dashboard-form"]').should('be.visible');
    
    cy.get('[data-testid="dashboard-name-input"]').type('Test Dashboard');
    cy.get('[data-testid="dashboard-description-input"]').type('Test Description');
    
    cy.get('[data-testid="save-dashboard-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should add widget to dashboard', () => {
    cy.visit('/dashboard/test-dashboard');
    
    cy.get('[data-testid="add-widget-button"]').click();
    cy.get('[data-testid="widget-form"]').should('be.visible');
    
    cy.get('[data-testid="widget-title-input"]').type('Student Count');
    cy.get('[data-testid="widget-type-select"]').select('METRIC_CARD');
    cy.get('[data-testid="widget-query-input"]').type('SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\'');
    
    cy.get('[data-testid="save-widget-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="widget"]').should('contain', 'Student Count');
  });

  it('should drag and drop widget', () => {
    cy.visit('/dashboard/test-dashboard');
    
    // Assuming there are widgets on the dashboard
    cy.get('[data-testid="widget"]').first().trigger('mousedown', { which: 1 });
    cy.get('[data-testid="dashboard-grid"]').trigger('mousemove', { clientX: 200, clientY: 200 });
    cy.get('[data-testid="dashboard-grid"]').trigger('mouseup');
    
    // Widget should be in new position
    cy.get('[data-testid="widget"]').first().should('have.attr', 'style').and('include', 'transform');
  });
});

describe('Performance E2E Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
  });

  it('should load dashboard within acceptable time', () => {
    const startTime = Date.now();
    
    cy.visit('/dashboard');
    cy.get('[data-testid="dashboard"]').should('be.visible');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).to.be.lessThan(3000); // 3 seconds
  });

  it('should handle large data sets efficiently', () => {
    cy.visit('/dynamic/students');
    
    // Test with large dataset
    cy.get('[data-testid="students-table"]').should('be.visible');
    cy.get('[data-testid="students-table"]').should('not.have.class', 'loading');
  });
});
