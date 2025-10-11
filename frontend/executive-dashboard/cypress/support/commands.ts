/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      createUser(userData: any): Chainable<void>;
      deleteUser(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add('createUser', (userData: any) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/register',
    body: userData,
  });
});

Cypress.Commands.add('deleteUser', (email: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/users/${email}`,
  });
});
