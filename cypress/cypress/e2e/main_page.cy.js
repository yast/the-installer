/// <reference types="cypress" />

describe('The main page', () => {
  // login and go to the main page once for all tests to make it faster
  before(() => {
    cy.login();
    cy.main_page();
  })

  it('sets the page title', () => {
    cy.title().should('eq', 'D-Installer');
  });

  it('displays the Install button', () => {
    cy.contains('button', 'Install');
  });

  it('displays a description after pressing the About button', () => {
    cy.contains('button', 'About').click();
    // check the popup dialog title
    cy.get('[role="dialog"]').contains('h1', 'About D-Installer');
    cy.get('[role="dialog"]').contains('button', 'Close').click();

    // the dialog is closed
    cy.get('[role="dialog"]').should('not.exist');
  })
})
