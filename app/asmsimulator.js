var app=angular.module("asmsimulator",[]);app.service("assembler",["opcodes",function(opcodes){return{go:function(input){for(var regex=/^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(byte|BYTE))?(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?[\t ]*(?:;.*)?$/,regexNum=/^[-+]?[0-9]+$/,regexLabel=/^[.A-Za-z]\w*$/,code=[],mapping={},labels={},normalizedLabels={},lines=input.split("\n"),parseNumber=function(input){if("0x"===input.slice(0,2))return parseInt(input.slice(2),16);if("0o"===input.slice(0,2))return parseInt(input.slice(2),8);if("b"===input.slice(input.length-1))return parseInt(input.slice(0,input.length-1),2);if("d"===input.slice(input.length-1))return parseInt(input.slice(0,input.length-1),10);if(regexNum.exec(input))return parseInt(input,10);throw"Invalid number format"},parseRegister=function(input){return input=input.toUpperCase(),"A"===input?0:"B"===input?1:"C"===input?2:"D"===input?3:"SP"===input?4:void 0},parseOffsetAddressing=function(input){input=input.toUpperCase();var m=0,base=0;if("A"===input[0])base=0;else if("B"===input[0])base=1;else if("C"===input[0])base=2;else if("D"===input[0])base=3;else{if("SP"!==input.slice(0,2))return;base=4}var offset_start=1;if(4===base&&(offset_start=2),"-"===input[offset_start])m=-1;else{if("+"!==input[offset_start])return;m=1}var offset=m*parseInt(input.slice(offset_start+1),10);if(offset<-4096||offset>4095)throw"Offset must be a value between -16 and 15";return offset<0&&(offset=8191+offset),8*offset+base},parseRegOrNumber=function(input,typeReg,typeNumber){var register=parseRegister(input);if(void 0!==register)return{type:typeReg,value:register};var label=parseLabel(input);if(void 0!==label)return{type:typeNumber,value:label};if("regaddress"===typeReg&&void 0!==(register=parseOffsetAddressing(input)))return{type:typeReg,value:register};var value=parseNumber(input);if(isNaN(value))throw"Not a "+typeNumber+": "+value;if(value<0||value>65535)throw typeNumber+" must have a value between 0 and 65535";return{type:typeNumber,value:value}},parseLabel=function(input){return regexLabel.exec(input)?input:void 0},getValue=function(input){switch(input.slice(0,1)){case"[":var address=input.slice(1,input.length-1);return parseRegOrNumber(address,"regaddress","address");case'"':for(var text=input.slice(1,input.length-1),chars=[],i=0,l=text.length;i<l;i++)chars.push(text.charCodeAt(i));return{type:"numbers",value:chars};case"'":var character=input.slice(1,input.length-1);if(character.length>1)throw"Only one character is allowed. Use String instead";return{type:"number",value:character.charCodeAt(0)};default:return parseRegOrNumber(input,"register","number")}},checkNoExtraArg=function(instr,arg){if(void 0!==arg)throw instr+": too many arguments"},codePushOperands=function(){for(var i=0;i<arguments.length;i++)angular.isNumber(arguments[i])?code.push(arguments[i]>>8,255&arguments[i]):code.push(arguments[i],arguments[i])},i=0,l=lines.length;i<l;i++)try{var match=regex.exec(lines[i]);if(void 0!==match[1]||void 0!==match[2]){if(void 0!==match[1]&&function(label){var upperLabel=label.toUpperCase();if(upperLabel in normalizedLabels)throw"Duplicate label: "+label;if("A"===upperLabel||"B"===upperLabel||"C"===upperLabel||"D"===upperLabel)throw"Label contains keyword: "+upperLabel;labels[label]=code.length}(match[1]),void 0!==match[2]){var p1,p2,opCode,instr=match[2].toUpperCase();switch("DB"!==instr&&(mapping[code.length]=i),instr){case"DB":if(p1=getValue(match[4]),"number"===p1.type)code.push(p1.value);else{if("numbers"!==p1.type)throw"DB does not support this operand";for(var j=0,k=p1.value.length;j<k;j++)code.push(p1.value[j])}break;case"HLT":checkNoExtraArg("HLT",match[4]),opCode=opcodes.NONE,code.push(opCode);break;case"MOV":if(p1=getValue(match[4]),p2=getValue(match[8]),void 0!==match[3])if("register"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_BYTE_REG_TO_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.MOV_BYTE_ADDRESS_TO_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.MOV_BYTE_REGADDRESS_TO_REG;else if("address"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_BYTE_REG_TO_ADDRESS;else if("regaddress"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_BYTE_REG_TO_REGADDRESS;else if("register"===p1.type&&"number"===p2.type)opCode=opcodes.MOV_BYTE_NUMBER_TO_REG;else if("address"===p1.type&&"number"===p2.type)opCode=opcodes.MOV_BYTE_NUMBER_TO_ADDRESS;else{if("regaddress"!==p1.type||"number"!==p2.type)throw"MOV does not support this operands";opCode=opcodes.MOV_BYTE_NUMBER_TO_REGADDRESS}else if("register"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_REG_TO_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.MOV_ADDRESS_TO_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.MOV_REGADDRESS_TO_REG;else if("address"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_REG_TO_ADDRESS;else if("regaddress"===p1.type&&"register"===p2.type)opCode=opcodes.MOV_REG_TO_REGADDRESS;else if("register"===p1.type&&"number"===p2.type)opCode=opcodes.MOV_NUMBER_TO_REG;else if("address"===p1.type&&"number"===p2.type)opCode=opcodes.MOV_NUMBER_TO_ADDRESS;else{if("regaddress"!==p1.type||"number"!==p2.type)throw"MOV does not support this operands";opCode=opcodes.MOV_NUMBER_TO_REGADDRESS}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"ADD":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.ADD_REG_TO_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.ADD_REGADDRESS_TO_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.ADD_ADDRESS_TO_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"ADD does not support this operands";opCode=opcodes.ADD_NUMBER_TO_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"SUB":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.SUB_REG_FROM_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.SUB_REGADDRESS_FROM_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.SUB_ADDRESS_FROM_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"SUB does not support this operands";opCode=opcodes.SUB_NUMBER_FROM_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"INC":if(p1=getValue(match[4]),checkNoExtraArg("INC",match[8]),"register"!==p1.type)throw"INC does not support this operand";opCode=opcodes.INC_REG,code.push(opCode),codePushOperands(p1.value);break;case"DEC":if(p1=getValue(match[4]),checkNoExtraArg("DEC",match[8]),"register"!==p1.type)throw"DEC does not support this operand";opCode=opcodes.DEC_REG,code.push(opCode),codePushOperands(p1.value);break;case"CMP":if(p1=getValue(match[4]),p2=getValue(match[8]),void 0!==match[3])if("register"===p1.type&&"register"===p2.type)opCode=opcodes.CMP_BYTE_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.CMP_BYTE_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.CMP_BYTE_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"CMP does not support this operands";opCode=opcodes.CMP_BYTE_NUMBER_WITH_REG}else if("register"===p1.type&&"register"===p2.type)opCode=opcodes.CMP_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.CMP_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.CMP_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"CMP does not support this operands";opCode=opcodes.CMP_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"JMP":if(p1=getValue(match[4]),checkNoExtraArg("JMP",match[8]),"register"===p1.type)opCode=opcodes.JMP_REGADDRESS;else{if("number"!==p1.type)throw"JMP does not support this operands";opCode=opcodes.JMP_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JC":case"JB":case"JNAE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JC_REGADDRESS;else{if("number"!==p1.type)throw instr+" does not support this operand";opCode=opcodes.JC_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JNC":case"JNB":case"JAE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JNC_REGADDRESS;else{if("number"!==p1.type)throw instr+"does not support this operand";opCode=opcodes.JNC_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JZ":case"JE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JZ_REGADDRESS;else{if("number"!==p1.type)throw instr+" does not support this operand";opCode=opcodes.JZ_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JNZ":case"JNE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JNZ_REGADDRESS;else{if("number"!==p1.type)throw instr+" does not support this operand";opCode=opcodes.JNZ_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JA":case"JNBE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JA_REGADDRESS;else{if("number"!==p1.type)throw instr+" does not support this operand";opCode=opcodes.JA_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"JNA":case"JBE":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.JNA_REGADDRESS;else{if("number"!==p1.type)throw instr+" does not support this operand";opCode=opcodes.JNA_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"PUSH":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.PUSH_REG;else if("regaddress"===p1.type)opCode=opcodes.PUSH_REGADDRESS;else if("address"===p1.type)opCode=opcodes.PUSH_ADDRESS;else{if("number"!==p1.type)throw"PUSH does not support this operand";opCode=opcodes.PUSH_NUMBER}code.push(opCode),codePushOperands(p1.value);break;case"POP":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"!==p1.type)throw"PUSH does not support this operand";opCode=opcodes.POP_REG,code.push(opCode),codePushOperands(p1.value);break;case"CALL":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.CALL_REGADDRESS;else{if("number"!==p1.type)throw"CALL does not support this operand";opCode=opcodes.CALL_ADDRESS}code.push(opCode),codePushOperands(p1.value);break;case"RET":checkNoExtraArg(instr,match[4]),opCode=opcodes.RET,code.push(opCode);break;case"MUL":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.MUL_REG;else if("regaddress"===p1.type)opCode=opcodes.MUL_REGADDRESS;else if("address"===p1.type)opCode=opcodes.MUL_ADDRESS;else{if("number"!==p1.type)throw"MULL does not support this operand";opCode=opcodes.MUL_NUMBER}code.push(opCode),codePushOperands(p1.value);break;case"DIV":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"===p1.type)opCode=opcodes.DIV_REG;else if("regaddress"===p1.type)opCode=opcodes.DIV_REGADDRESS;else if("address"===p1.type)opCode=opcodes.DIV_ADDRESS;else{if("number"!==p1.type)throw"DIV does not support this operand";opCode=opcodes.DIV_NUMBER}code.push(opCode),codePushOperands(p1.value);break;case"AND":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.AND_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.AND_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.AND_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"AND does not support this operands";opCode=opcodes.AND_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"OR":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.OR_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.OR_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.OR_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"OR does not support this operands";opCode=opcodes.OR_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"XOR":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.XOR_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.XOR_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.XOR_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw"XOR does not support this operands";opCode=opcodes.XOR_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"NOT":if(p1=getValue(match[4]),checkNoExtraArg(instr,match[8]),"register"!==p1.type)throw"NOT does not support this operand";opCode=opcodes.NOT_REG,code.push(opCode),codePushOperands(p1.value);break;case"SHL":case"SAL":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.SHL_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.SHL_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.SHL_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw instr+" does not support this operands";opCode=opcodes.SHL_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;case"SHR":case"SAR":if(p1=getValue(match[4]),p2=getValue(match[8]),"register"===p1.type&&"register"===p2.type)opCode=opcodes.SHR_REG_WITH_REG;else if("register"===p1.type&&"regaddress"===p2.type)opCode=opcodes.SHR_REGADDRESS_WITH_REG;else if("register"===p1.type&&"address"===p2.type)opCode=opcodes.SHR_ADDRESS_WITH_REG;else{if("register"!==p1.type||"number"!==p2.type)throw instr+" does not support this operands";opCode=opcodes.SHR_NUMBER_WITH_REG}code.push(opCode),codePushOperands(p1.value,p2.value);break;default:throw"Invalid instruction: "+match[2]}}}else{var line=lines[i].trim();if(""!==line&&";"!==line.slice(0,1))throw"Syntax error"}}catch(e){throw{error:e,line:i}}for(i=0,l=code.length;i<l;i++)if(!angular.isNumber(code[i])){if(!(code[i]in labels))throw{error:"Undefined label: "+code[i]};var label=code[i];code[i]=labels[label]>>8,code[i+1]=255&labels[label]}return{code:code,mapping:mapping,labels:labels}}}}]),app.service("cpu",["opcodes","memory",function(opcodes,memory){var cpu={step:function(){var self=this;if(!0===self.fault)throw"FAULT. Reset to continue.";try{var checkGPR=function(reg){if(reg<0||reg>=self.gpr.length)throw"Invalid register: "+reg;return reg},checkGPR_SP=function(reg){if(reg<0||reg>=1+self.gpr.length)throw"Invalid register: "+reg;return reg},setGPR_SP=function(reg,value){if(reg>=0&&reg<self.gpr.length)self.gpr[reg]=value;else{if(reg!=self.gpr.length)throw"Invalid register: "+reg;if(self.sp=value,self.sp<self.minSP)throw"Stack overflow";if(self.sp>self.maxSP)throw"Stack underflow"}},getGPR_SP=function(reg){if(reg>=0&&reg<self.gpr.length)return self.gpr[reg];if(reg==self.gpr.length)return self.sp;throw"Invalid register: "+reg},indirectRegisterAddress=function(value){var base,reg=value%8;base=reg<self.gpr.length?self.gpr[reg]:self.sp;var offset=Math.floor(value/8);return offset>4095&&(offset-=8191),base+offset},checkOperation=function(value){return self.zero=!1,self.carry=!1,value>=65536?(self.carry=!0,value%=65536):0===value?self.zero=!0:value<0&&(self.carry=!0,value=65536- -value%65536),value},jump=function(newIP){if(newIP<0||newIP>=memory.data.length)throw"IP outside memory";self.ip=newIP},push=function(value){if(writeMemory(self.sp,2,value),self.sp-=2,self.sp<self.minSP)throw"Stack overflow"},pop=function(){var value=readMemory(self.sp+2,2);if(self.sp+=2,self.sp>self.maxSP)throw"Stack underflow";return value},division=function(divisor){if(0===divisor)throw"Division by 0";return Math.floor(self.gpr[0]/divisor)},readMemory=function(address,size){var data=memory.load(address);return size>1&&(data=data<<8|memory.load(address+1)),data},writeMemory=function(address,size,data){size>1?(memory.store(address,data>>8),memory.store(address+1,255&data)):memory.store(address,255&data)};if(self.ip<0||self.ip>=memory.data.length)throw"Instruction pointer is outside of memory";var regTo,regFrom,memFrom,memTo,number,instr=memory.load(self.ip);switch(instr){case opcodes.NONE:return!1;case opcodes.MOV_REG_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),setGPR_SP(regTo,getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_ADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,readMemory(memFrom,2)),self.ip+=5;break;case opcodes.MOV_REGADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.MOV_REG_TO_ADDRESS:memTo=readMemory(self.ip+1,2),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),writeMemory(memTo,2,getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_REG_TO_REGADDRESS:regTo=readMemory(self.ip+1,2),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),writeMemory(indirectRegisterAddress(regTo),2,getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_NUMBER_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),setGPR_SP(regTo,number),self.ip+=5;break;case opcodes.MOV_NUMBER_TO_ADDRESS:memTo=readMemory(self.ip+1,2),number=readMemory(self.ip+3,2),writeMemory(memTo,2,number),self.ip+=5;break;case opcodes.MOV_NUMBER_TO_REGADDRESS:regTo=readMemory(self.ip+1,2),number=readMemory(self.ip+3,2),writeMemory(indirectRegisterAddress(regTo),2,number),self.ip+=5;break;case opcodes.MOV_BYTE_REG_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),setGPR_SP(regTo,255&getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_BYTE_ADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,readMemory(memFrom,1)),self.ip+=5;break;case opcodes.MOV_BYTE_REGADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,readMemory(indirectRegisterAddress(regFrom),1)),self.ip+=5;break;case opcodes.MOV_BYTE_REG_TO_ADDRESS:memTo=readMemory(self.ip+1,2),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),writeMemory(memTo,1,255&getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_BYTE_REG_TO_REGADDRESS:regTo=readMemory(self.ip+1,2),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),writeMemory(indirectRegisterAddress(regTo),1,255&getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.MOV_BYTE_NUMBER_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),setGPR_SP(regTo,255&number),self.ip+=5;break;case opcodes.MOV_BYTE_NUMBER_TO_ADDRESS:memTo=readMemory(self.ip+1,2),number=readMemory(self.ip+3,2),writeMemory(memTo,1,255&number),self.ip+=5;break;case opcodes.MOV_BYTE_NUMBER_TO_REGADDRESS:regTo=readMemory(self.ip+1,2),number=readMemory(self.ip+3,2),writeMemory(indirectRegisterAddress(regTo),1,255&number),self.ip+=5;break;case opcodes.ADD_REG_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1)),regFrom=checkGPR_SP(readMemory(self.ip+3)),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)+getGPR_SP(regFrom))),self.ip+=5;break;case opcodes.ADD_REGADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)+memory.load(indirectRegisterAddress(regFrom)))),self.ip+=5;break;case opcodes.ADD_ADDRESS_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)+readMemory(memFrom,2))),self.ip+=5;break;case opcodes.ADD_NUMBER_TO_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)+number)),self.ip+=5;break;case opcodes.SUB_REG_FROM_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=checkGPR_SP(memory.load(self.ip+3)),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)-self.gpr[regFrom])),self.ip+=5;break;case opcodes.SUB_REGADDRESS_FROM_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)-readMemory(indirectRegisterAddress(regFrom),2))),self.ip+=5;break;case opcodes.SUB_ADDRESS_FROM_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)-readMemory(memFrom,2))),self.ip+=5;break;case opcodes.SUB_NUMBER_FROM_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)-number)),self.ip+=5;break;case opcodes.INC_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)+1)),self.ip+=3;break;case opcodes.DEC_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),setGPR_SP(regTo,checkOperation(getGPR_SP(regTo)-1)),self.ip+=3;break;case opcodes.CMP_REG_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),checkOperation(getGPR_SP(regTo)-getGPR_SP(regFrom)),self.ip+=5;break;case opcodes.CMP_REGADDRESS_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),checkOperation(getGPR_SP(regTo)-readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.CMP_ADDRESS_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),checkOperation(getGPR_SP(regTo)-readMemory(memFrom,2)),self.ip+=5;break;case opcodes.CMP_NUMBER_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),checkOperation(getGPR_SP(regTo)-number),self.ip+=5;break;case opcodes.CMP_BYTE_REG_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=checkGPR_SP(readMemory(self.ip+3,2)),checkOperation((255&getGPR_SP(regTo))-(255&getGPR_SP(regFrom))),self.ip+=5;break;case opcodes.CMP_BYTE_REGADDRESS_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),checkOperation((255&getGPR_SP(regTo))-readMemory(indirectRegisterAddress(regFrom),1)),self.ip+=5;break;case opcodes.CMP_BYTE_ADDRESS_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),checkOperation((255&getGPR_SP(regTo))-readMemory(memFrom,1)),self.ip+=5;break;case opcodes.CMP_BYTE_NUMBER_WITH_REG:regTo=checkGPR_SP(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),checkOperation((255&getGPR_SP(regTo))-(255&number)),self.ip+=5;break;case opcodes.JMP_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),jump(self.gpr[regTo]);break;case opcodes.JMP_ADDRESS:number=readMemory(self.ip+1,2),jump(number);break;case opcodes.JC_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),self.carry?jump(self.gpr[regTo]):self.ip+=3;break;case opcodes.JC_ADDRESS:number=readMemory(self.ip+1,2),self.carry?jump(number):self.ip+=3;break;case opcodes.JNC_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),self.carry?self.ip+=3:jump(self.gpr[regTo]);break;case opcodes.JNC_ADDRESS:number=readMemory(self.ip+1,2),self.carry?self.ip+=3:jump(number);break;case opcodes.JZ_REGADDRESS:regTo=checkGPR(readMemory.load(self.ip+1,2)),self.zero?jump(self.gpr[regTo]):self.ip+=3;break;case opcodes.JZ_ADDRESS:number=readMemory(self.ip+1,2),self.zero?jump(number):self.ip+=3;break;case opcodes.JNZ_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),self.zero?self.ip+=3:jump(self.gpr[regTo]);break;case opcodes.JNZ_ADDRESS:number=readMemory(self.ip+1,2),self.zero?self.ip+=3:jump(number);break;case opcodes.JA_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),self.zero||self.carry?self.ip+=3:jump(self.gpr[regTo]);break;case opcodes.JA_ADDRESS:number=readMemory(self.ip+1,2),self.zero||self.carry?self.ip+=3:jump(number);break;case opcodes.JNA_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),self.zero||self.carry?jump(self.gpr[regTo]):self.ip+=3;break;case opcodes.JNA_ADDRESS:number=readMemory(self.ip+1,2),self.zero||self.carry?jump(number):self.ip+=3;break;case opcodes.PUSH_REG:regFrom=checkGPR(readMemory(self.ip+1,2)),push(self.gpr[regFrom]),self.ip+=3;break;case opcodes.PUSH_REGADDRESS:regFrom=readMemory(self.ip+1,2),push(memory.load(indirectRegisterAddress(regFrom))),self.ip+=3;break;case opcodes.PUSH_ADDRESS:memFrom=readMemory(self.ip+1,2),push(readMemory(memFrom,2)),self.ip+=3;break;case opcodes.PUSH_NUMBER:number=readMemory(self.ip+1,2),push(number),self.ip+=3;break;case opcodes.POP_REG:regTo=checkGPR(readMemory(self.ip+1,2)),self.gpr[regTo]=pop(),self.ip+=3;break;case opcodes.CALL_REGADDRESS:regTo=checkGPR(readMemory(self.ip+1,2)),push(self.ip+3),jump(self.gpr[regTo]);break;case opcodes.CALL_ADDRESS:number=readMemory(self.ip+1,2),push(self.ip+3),jump(number);break;case opcodes.RET:jump(pop());break;case opcodes.MUL_REG:regFrom=checkGPR(readMemory(self.ip+1,2)),self.gpr[0]=checkOperation(self.gpr[0]*self.gpr[regFrom]),self.ip+=3;break;case opcodes.MUL_REGADDRESS:regFrom=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(self.gpr[0]*readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=3;break;case opcodes.MUL_ADDRESS:memFrom=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(self.gpr[0]*readMemory(memFrom,2)),self.ip+=3;break;case opcodes.MUL_NUMBER:number=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(self.gpr[0]*number),self.ip+=3;break;case opcodes.DIV_REG:regFrom=checkGPR(readMemory(self.ip+1,2)),self.gpr[0]=checkOperation(division(self.gpr[regFrom])),self.ip+=3;break;case opcodes.DIV_REGADDRESS:regFrom=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(division(readMemory(indirectRegisterAddress(regFrom),2))),self.ip+=3;break;case opcodes.DIV_ADDRESS:memFrom=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(division(readMemory(memFrom,2))),self.ip+=3;break;case opcodes.DIV_NUMBER:number=readMemory(self.ip+1,2),self.gpr[0]=checkOperation(division(number)),self.ip+=3;break;case opcodes.AND_REG_WITH_REG:regTo=checkGPR(memory.load(++self.ip)),regFrom=checkGPR(memory.load(++self.ip)),self.gpr[regTo]=checkOperation(self.gpr[regTo]&self.gpr[regFrom]),self.ip++;break;case opcodes.AND_REGADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]&readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.AND_ADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]&readMemory(memFrom,2)),self.ip+=5;break;case opcodes.AND_NUMBER_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]&number),self.ip+=5;break;case opcodes.OR_REG_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=checkGPR(readMemory(self.ip+3,2)),self.gpr[regTo]=checkOperation(self.gpr[regTo]|self.gpr[regFrom]),self.ip+=5;break;case opcodes.OR_REGADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]|readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.OR_ADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]|readMemory(memFrom,2)),self.ip+=5;break;case opcodes.OR_NUMBER_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]|number),self.ip+=5;break;case opcodes.XOR_REG_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=checkGPR(readMemory(self.ip+3,2)),self.gpr[regTo]=checkOperation(self.gpr[regTo]^self.gpr[regFrom]),self.ip+=5;break;case opcodes.XOR_REGADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]^readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.XOR_ADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]^readMemory(memFrom,2)),self.ip+=5;break;case opcodes.XOR_NUMBER_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]^number),self.ip+=5;break;case opcodes.NOT_REG:regTo=checkGPR(readMemory(self.ip+1,2)),self.gpr[regTo]=checkOperation(~self.gpr[regTo]),self.ip+=3;break;case opcodes.SHL_REG_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=checkGPR(readMemory(self.ip+3,2)),self.gpr[regTo]=checkOperation(self.gpr[regTo]<<self.gpr[regFrom]),self.ip+=5;break;case opcodes.SHL_REGADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]<<readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.SHL_ADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]<<readMemory(memFrom,2)),self.ip+=5;break;case opcodes.SHL_NUMBER_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]<<number),self.ip+=5;break;case opcodes.SHR_REG_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=checkGPR(readMemory(self.ip+3,2)),self.gpr[regTo]=checkOperation(self.gpr[regTo]>>>self.gpr[regFrom]),self.ip+=5;break;case opcodes.SHR_REGADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),regFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]>>>readMemory(indirectRegisterAddress(regFrom),2)),self.ip+=5;break;case opcodes.SHR_ADDRESS_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),memFrom=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]>>>readMemory(memFrom,2)),self.ip+=5;break;case opcodes.SHR_NUMBER_WITH_REG:regTo=checkGPR(readMemory(self.ip+1,2)),number=readMemory(self.ip+3,2),self.gpr[regTo]=checkOperation(self.gpr[regTo]>>>number),self.ip+=5;break;default:throw"Invalid op code: "+instr}return!0}catch(e){throw self.fault=!0,e}},reset:function(){var self=this;self.maxSP=991,self.minSP=0,self.gpr=[0,0,0,0],self.sp=self.maxSP-1,self.ip=0,self.zero=!1,self.carry=!1,self.fault=!1}};return cpu.reset(),cpu}]),app.service("memory",[function(){var memory={data:Array(1024),lastAccess:-1,load:function(address){var self=this;if(address<0||address>=self.data.length)throw"Memory access violation at "+address;return self.lastAccess=address,self.data[address]},store:function(address,value){var self=this;if(address<0||address>=self.data.length)throw"Memory access violation at "+address;self.lastAccess=address,self.data[address]=value},reset:function(){var self=this;self.lastAccess=-1;for(var i=0,l=self.data.length;i<l;i++)self.data[i]=0}};return memory.reset(),memory}]),app.service("opcodes",[function(){return{NONE:0,MOV_REG_TO_REG:1,MOV_ADDRESS_TO_REG:2,MOV_REGADDRESS_TO_REG:3,MOV_REG_TO_ADDRESS:4,MOV_REG_TO_REGADDRESS:5,MOV_NUMBER_TO_REG:6,MOV_NUMBER_TO_ADDRESS:7,MOV_NUMBER_TO_REGADDRESS:8,MOV_BYTE_REG_TO_REG:9,MOV_BYTE_ADDRESS_TO_REG:10,MOV_BYTE_REGADDRESS_TO_REG:11,MOV_BYTE_REG_TO_ADDRESS:12,MOV_BYTE_REG_TO_REGADDRESS:13,MOV_BYTE_NUMBER_TO_REG:14,MOV_BYTE_NUMBER_TO_ADDRESS:15,MOV_BYTE_NUMBER_TO_REGADDRESS:16,ADD_REG_TO_REG:20,ADD_REGADDRESS_TO_REG:21,ADD_ADDRESS_TO_REG:22,ADD_NUMBER_TO_REG:23,SUB_REG_FROM_REG:24,SUB_REGADDRESS_FROM_REG:25,SUB_ADDRESS_FROM_REG:26,SUB_NUMBER_FROM_REG:27,INC_REG:28,DEC_REG:29,CMP_REG_WITH_REG:30,CMP_REGADDRESS_WITH_REG:31,CMP_ADDRESS_WITH_REG:32,CMP_NUMBER_WITH_REG:33,CMP_BYTE_REG_WITH_REG:34,CMP_BYTE_REGADDRESS_WITH_REG:35,CMP_BYTE_ADDRESS_WITH_REG:36,CMP_BYTE_NUMBER_WITH_REG:37,JMP_REGADDRESS:40,JMP_ADDRESS:41,JC_REGADDRESS:42,JC_ADDRESS:43,JNC_REGADDRESS:44,JNC_ADDRESS:45,JZ_REGADDRESS:46,JZ_ADDRESS:47,JNZ_REGADDRESS:48,JNZ_ADDRESS:49,JA_REGADDRESS:50,JA_ADDRESS:51,JNA_REGADDRESS:52,JNA_ADDRESS:53,
PUSH_REG:60,PUSH_REGADDRESS:61,PUSH_ADDRESS:62,PUSH_NUMBER:63,POP_REG:64,CALL_REGADDRESS:65,CALL_ADDRESS:66,RET:67,MUL_REG:70,MUL_REGADDRESS:71,MUL_ADDRESS:72,MUL_NUMBER:73,DIV_REG:74,DIV_REGADDRESS:75,DIV_ADDRESS:76,DIV_NUMBER:77,AND_REG_WITH_REG:80,AND_REGADDRESS_WITH_REG:81,AND_ADDRESS_WITH_REG:82,AND_NUMBER_WITH_REG:83,OR_REG_WITH_REG:84,OR_REGADDRESS_WITH_REG:85,OR_ADDRESS_WITH_REG:86,OR_NUMBER_WITH_REG:87,XOR_REG_WITH_REG:88,XOR_REGADDRESS_WITH_REG:89,XOR_ADDRESS_WITH_REG:90,XOR_NUMBER_WITH_REG:91,NOT_REG:92,SHL_REG_WITH_REG:100,SHL_REGADDRESS_WITH_REG:101,SHL_ADDRESS_WITH_REG:102,SHL_NUMBER_WITH_REG:103,SHR_REG_WITH_REG:104,SHR_REGADDRESS_WITH_REG:105,SHR_ADDRESS_WITH_REG:106,SHR_NUMBER_WITH_REG:107}}]),app.controller("Ctrl",["$document","$scope","$timeout","cpu","memory","assembler",function($document,$scope,$timeout,cpu,memory,assembler){$scope.memory=memory,$scope.cpu=cpu,$scope.error="",$scope.isRunning=!1,$scope.displayHex=!0,$scope.displayInstr=!0,$scope.displayA=!1,$scope.displayB=!1,$scope.displayC=!1,$scope.displayD=!1,$scope.speeds=[{speed:.125,desc:"⅛ Hz"},{speed:.25,desc:"¼ Hz"},{speed:.5,desc:"½ Hz"},{speed:1,desc:"1 Hz"},{speed:2,desc:"2 Hz"},{speed:4,desc:"4 Hz"},{speed:8,desc:"8 Hz"},{speed:16,desc:"16 Hz"}],$scope.speed=4,$scope.outputStartIndex=992,$scope.code='; Simple example\n; Writes Hello World to the output\n\n\tJMP start\nhello:\tDB "Hello World!"\t; Variable\n\tDB 0\t\t\t; String terminator\n\tDB 0\t\t\t; Temporary fix\n\nstart:\n\tMOV C, hello\t\t; Point to var\n\tMOV D, 0x3E0\t\t; Point to output\n\tCALL print\n\tHLT\t\t\t; Stop execution\n\nprint:\t\t\t\t; print(C:*from, D:*to)\n\tPUSH A\n\tPUSH B\n\tMOV B, 0\n\n.loop:\n\tMOV A, [C]\t\t; Get char from var\n\tMOV [D], A\t\t; Write to output\n\tINC C\n\tINC D\n\tCMP B, [C]\t\t; Check if end\n\tJNZ .loop\t\t; jump if not\n\n\tPOP B\n\tPOP A\n\tRET',$scope.reset=function(){cpu.reset(),memory.reset(),$scope.error="",$scope.selectedLine=-1},$scope.executeStep=function(){$scope.checkPrgrmLoaded()||$scope.assemble();try{var res=cpu.step();return cpu.ip in $scope.mapping&&($scope.selectedLine=$scope.mapping[cpu.ip]),res}catch(e){return $scope.error=e,!1}};var runner;$scope.run=function(){$scope.checkPrgrmLoaded()||$scope.assemble(),$scope.isRunning=!0,runner=$timeout(function(){!0===$scope.executeStep()?$scope.run():$scope.isRunning=!1},1e3/$scope.speed)},$scope.stop=function(){$timeout.cancel(runner),$scope.isRunning=!1},$scope.checkPrgrmLoaded=function(){for(var i=0,l=memory.data.length;i<l;i++)if(0!==memory.data[i])return!0;return!1},$scope.getChar=function(value){var text=String.fromCharCode(value);return""===text.trim()?"  ":text},$scope.assemble=function(){try{$scope.reset();var assembly=assembler.go($scope.code);$scope.mapping=assembly.mapping;var binary=assembly.code;if($scope.labels=assembly.labels,binary.length>memory.data.length)throw"Binary code does not fit into the memory. Max "+memory.data.length+" bytes are allowed";for(var i=0,l=binary.length;i<l;i++)memory.data[i]=binary[i]}catch(e){void 0!==e.line?($scope.error=e.line+" | "+e.error,$scope.selectedLine=e.line):$scope.error=e.error}},$scope.jumpToLine=function(index){$document[0].getElementById("sourceCode").scrollIntoView(),$scope.selectedLine=$scope.mapping[index]},$scope.isInstruction=function(index){return void 0!==$scope.mapping&&void 0!==$scope.mapping[index]&&$scope.displayInstr},$scope.getMemoryCellCss=function(index){return index>=$scope.outputStartIndex?"output-bg":$scope.isInstruction(index)?"instr-bg":index>cpu.sp&&index<=cpu.maxSP?"stack-bg":""},$scope.getMemoryInnerCellCss=function(index){return index===cpu.ip?"marker marker-ip":index===cpu.sp?"marker marker-sp":index===cpu.gpr[0]&&$scope.displayA?"marker marker-a":index===cpu.gpr[1]&&$scope.displayB?"marker marker-b":index===cpu.gpr[2]&&$scope.displayC?"marker marker-c":index===cpu.gpr[3]&&$scope.displayD?"marker marker-d":""}}]),app.filter("flag",function(){return function(input){return input.toString().toUpperCase()}}),app.filter("number",function(){return function(input,isHex,width){if(isHex){var hex=input.toString(16).toUpperCase(),diff=width-hex.length;if(!width|width<0||diff<0)return hex;for(;diff>0;)hex="0"+hex,diff--;return hex}return input.toString(10)}}),app.directive("selectLine",[function(){return{restrict:"A",link:function(scope,element,attrs,controller){scope.$watch("selectedLine",function(){if(scope.selectedLine>=0){for(var lines=element[0].value.split("\n"),startPos=0,x=0;x<lines.length&&x!=scope.selectedLine;x++)startPos+=lines[x].length+1;var endPos=lines[scope.selectedLine].length+startPos;if(void 0!==element[0].selectionStart&&(element[0].focus(),element[0].selectionStart=startPos,element[0].selectionEnd=endPos),document.selection&&document.selection.createRange){element[0].focus(),element[0].select();var range=document.selection.createRange();range.collapse(!0),range.moveEnd("character",endPos),range.moveStart("character",startPos),range.select()}}})}}}]),app.filter("startFrom",function(){return function(input,start){return start=+start,input.slice(start)}}),app.directive("tabSupport",[function(){return{restrict:"A",link:function(scope,element,attrs,controller){element.bind("keydown",function(e){if(9===e.keyCode){var val=this.value,start=this.selectionStart,end=this.selectionEnd;return this.value=val.substring(0,start)+"\t"+val.substring(end),this.selectionStart=this.selectionEnd=start+1,e.preventDefault(),!1}})}}}]);