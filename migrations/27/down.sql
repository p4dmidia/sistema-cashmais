
-- Revert back to original hashes
UPDATE companies SET senha_hash = '$2b$12$P413TIah8y5iym8.q6MQHOXvZag4sj5ZM/2IuF3KltTJRdOp54XwC' WHERE id = 1;
UPDATE affiliates SET password_hash = '$2b$12$L6SV.Qcf95i1lmvDDOIlMuxDt4xqOwUUjV7vMJwhuYZ5fXilYEOZK' WHERE id = 1;
UPDATE company_cashiers SET password_hash = '$2b$12$dTYH5FxNfjU9ugOo4U05IueTfjt.snbItxFbSej3xXGp4d/xS/ht6' WHERE id = 1;
UPDATE affiliates SET password_hash = '$2a$12$7eA8qHY0QoYzjCkr3J5YuO7b8lVf8hGxXzQ4z9yN6wM1p2r3s4t5u6' WHERE id = 2;
