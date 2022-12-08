/// <reference types="cypress" />

describe('D-Installer', () => {
  // login and go to the main page once for all tests to make it faster
  before(() => {
    if (!Cypress.env('SKIP_LOGIN')) cy.login();
    cy.main_page();
  })

  // TODO: we should not test the exact wording, this is fragile

  it('sets the root password', () => {
    cy.get('.overview-users p').contains('Root password is').find('button').click();
    cy.get('#password').type('d-installer');
    cy.get('#passwordConfirmation').type('d-installer');
    cy.get('button[type="submit"]').click();

    // the dialog is closed
    cy.get('[role="dialog"]').should('not.exist');

    cy.get('.overview-users p').contains('Root password is set');
  })
})
