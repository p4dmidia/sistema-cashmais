// Script para gerar hash bcrypt correto
import bcrypt from 'bcryptjs';

const password = 'temp123';
const saltRounds = 12;

const hash = await bcrypt.hash(password, saltRounds);
console.log('Hash bcrypt para senha "temp123":');
console.log(hash);

// Testar verificação
const isValid = await bcrypt.compare(password, hash);
console.log('Verificação:', isValid);