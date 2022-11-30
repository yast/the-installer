/// <reference types="cypress" />

describe('The login page', () => {
  beforeEach(() => {
    cy.main_page();
  });

  // TODO: skip these tests when the D-Installer is running locally
  //       (https://localhost:9090)

  it('allows root to login', () => {
    let login = Cypress.env('LOGIN_USER') || 'root';
    let password = Cypress.env('LOGIN_PASSWORD') || 'linux';

    // wait until the login form is visible
    cy.get('#login-user-input').should('be.visible').type(login);
    cy.get('#login-password-input').type(password);
    cy.get('#login-button').click();

    // the login button disappears
    cy.get('#login-button').should('not.exist');
  })

  it('reports an error for a wrong password', () => {
    // wait until the login form is visible
    cy.get('#login-user-input').should('be.visible').type('root');
    cy.get('#login-password-input').type('wrong-password');
    cy.get('#login-button').click();

    // an error is reported, use longer timeout because unsuccessful login
    // takes more time
    cy.get('#login-error-message', { timeout: 10000 }).should('not.be.empty');
  })
})
