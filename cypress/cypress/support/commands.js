// here you can define custom Cypress commands,
// see more details at https://on.cypress.io/custom-commands

// log into the D-Installer as root
// TODO: optionally read the credentials from the environment
Cypress.Commands.add('login', () => {
  // authenticate via API to make it faster
  let login = Cypress.env('LOGIN_USER') || 'root';
  let password = Cypress.env('LOGIN_PASSWORD') || 'linux';

  cy.request({
    url: 'cockpit/login',
    auth: {
      username: login,
      password: password
    }
  });
});

Cypress.Commands.add('main_page', () => {
  return cy.visit('/cockpit/@localhost/d-installer/index.html');
});
