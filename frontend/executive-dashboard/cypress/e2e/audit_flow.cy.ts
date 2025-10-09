describe('Denetim Akışı', () => {
  it('Admin koç siler ve audit log oluşur', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@okuz.ai');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();

    cy.contains('Koç Yönetimi').click();
    cy.contains('Sil').first().click();
    cy.contains('Sil').filter('button').click();

    cy.contains('Denetim Kayıtları').click();
    cy.get('input[placeholder="Kullanıcı ara"]').type('admin@okuz.ai');
    cy.contains('Ara').click();
    cy.contains('coach.delete').should('exist');
  });
});


