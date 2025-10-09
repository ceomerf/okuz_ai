describe('Yetkilendirme Akışı', () => {
  it('Editör rolü oluştur, izin ata ve erişimi doğrula', () => {
    // Login as admin (assumes a test login page/session helper)
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@okuz.ai');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();

    // RBAC paneline git ve rol oluştur
    cy.contains('Rol Yönetimi').click();
    cy.contains('Yeni Rol').click();
    cy.get('input[name="roleName"]').type('EDITOR');
    cy.get('textarea[name="roleDescription"]').type('Sadece öğrenci düzenleme yetkisi');
    cy.contains('Kaydet').click();

    // İzin ata (students.update)
    cy.contains('İzinler').click();
    cy.get('[data-permission="students.update"] input[type="checkbox"]').check();
    cy.contains('İzinleri Kaydet').click();

    // Yeni kullanıcı oluştur ve role ata
    cy.contains('Kullanıcı Yönetimi').click();
    cy.contains('Yeni Kullanıcı').click();
    cy.get('input[name="email"]').type('editor@okuz.ai');
    cy.get('input[name="name"]').type('Editör Kullanıcı');
    cy.get('input[name="password"]').type('editor1234');
    cy.get('select[name="roles"]').select('EDITOR');
    cy.contains('Kaydet').click();

    // Çıkış yap ve editör ile giriş yap
    cy.contains('Çıkış').click();
    cy.get('input[name="email"]').type('editor@okuz.ai');
    cy.get('input[name="password"]').type('editor1234');
    cy.get('button[type="submit"]').click();

    // Öğrenci düzenleyebildiğini, silemediğini doğrula
    cy.contains('Öğrenci Yönetimi').click();
    cy.contains('Düzenle').should('exist');
    cy.contains('Sil').should('not.exist');

    // Faturalama paneline erişemediğini doğrula
    cy.contains('Faturalama').should('not.exist');
  });
});


