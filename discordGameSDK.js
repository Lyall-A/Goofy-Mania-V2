const koffi = require('koffi');
const lib = koffi.load('user32.dll');

const MessageBoxA = lib.func("MessageBoxA", "int", ["void *", "str", "str", "uint"]);
const MB_ICONINFORMATION = 0x40;

MessageBoxA(null, 'sdasdassa', 'asdsadad', MB_ICONINFORMATION);