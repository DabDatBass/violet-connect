/*
How to use the encode and decode functions:
encode: The parameters are the string you want to use, and then true or false based on if you want to use Huffman Coding which can possibly compress.~
decode: Input the encoded cloud and it will decode it, no extra parameters needed.
*/

const scratch = require("node-scratch-client");
const fs = require('fs');

const PROJECT_ID = 454338422;
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_ .,:;'\"\\?!/()[]{}+-=*@#&";
const CHAR_BITS = CHARS.length.toString(2).length;

let files = JSON.parse(fs.readFileSync('files.json'));

const Client = new scratch.Client({
  username: "VioletOS-VI",
  password: process.env.PASSWORD
});

let encode = (string, huffman, cb) => {
	let text = "";
	let length = 0;
	if(huffman){
		text = encodeHuffman(string);
		length = text.length;
	} else {
		text = encodePlainText(string);
		length = Math.ceil(2 + text.length / Math.log10(2));
		text = largeDecimalToBinary(text);
		while(text.length < length)
			text = "0" + text;
	}

	length = length.toString(2);
	while(length.length < 14)
		length = "0" + length;
	return largeBinaryToDecimal((length + (huffman ? "1" : "0") + text).split("").reverse().join(""));
}

let decode = (number, cb) => {
	/*
		Encoding:
		Binary is reversed to preserve 0s

		Header:
		14 bits stating how many bits long the sent binary is
		1 bit as the flag for Huffman Coding
	*/
	let binary = largeDecimalToBinary(number).split("").reverse().join("");
	let length = parseInt(binary.substr(0, 14), 2);
	let text = binary.substr(15);

	while(text.length < length)
		text = text + "0";

	if(binary[14] == "1"){
		return decodeHuffman(text)
	} else {
		return decodePlainText(largeBinaryToDecimal(text))
	}
}

let largeBinaryToDecimal = binary => {
	return BigInt("0b" + binary).toString();
}

let largeDecimalToBinary = number => {
	return BigInt(number).toString(2);
}

let decodePlainText = number => {
	let decoded = "";
	for (let i = 0; i < number.length; i += 2) {
		decoded += CHARS[parseInt(number[i] + number[i+1])];
	}
	return decoded;
}

let decodeHuffman = binary => {
	let max_bits = parseInt(binary.substr(0, 4), 2);
	let bit_amounts = [];
	var j = 4;
	for(let i = 1, count = 0; i <= max_bits; i++){
		let min_bits = Math.min((CHARS.length - count).toString(2).length, 1 + i);
		let current_amount = parseInt(binary.substr(j, min_bits), 2);
		count += current_amount;
		bit_amounts[i - 1] = current_amount;
		j += min_bits;
	}
	let chars = [];
	let char_encodings = [];
	let encoding_value = 0;
	for(i = 0; i < bit_amounts.length; i++){
		for(let k = 0; k < bit_amounts[i]; k++, j += CHAR_BITS){
			chars.push(CHARS[parseInt(binary.substr(j, CHAR_BITS), 2)]);
			let encoding = encoding_value.toString(2);
			while(encoding.length < i + 1)
				encoding = "0" + encoding;

			char_encodings.push(encoding);
			encoding_value++;
			if(k == bit_amounts[i] - 1){
				for(var temp_i = i + 1; temp_i < bit_amounts.length && bit_amounts[temp_i] == 0; temp_i++);
				encoding_value <<= (temp_i - i);
			}
		}
	}
	let output = "";
	while(j < binary.length){
		let str = "";
		while(!char_encodings.includes(str) && j < binary.length){
			str += binary[j];
			j++
		}
		if(char_encodings.includes(str))
			output += chars[char_encodings.indexOf(str)];
	}
	return output
}

let encodePlainText = string => {
  let encoded = "";
  for (let i = 0; i < string.length; i ++) {
    let id = CHARS.indexOf(string[i])
    if (id < 10) {
      id = "0" + id;
    }
    encoded += id;
  }
  return encoded;	
}

let encodeHuffman = string => {
	let dictionary = [];
	let amounts = [];
	for(let i = 0; i < string.length; i++){
		if(dictionary.includes(string[i]))
			amounts[dictionary.indexOf(string[i])]++;
		else {
			dictionary.push(string[i]);
			amounts.push(1);
		}
	}

	let sort_gap = amounts.length;
	let sorted = false;
	while(!sorted){
		sort_gap = Math.floor(sort_gap / 1.3);
		if(sort_gap < 1){
			sort_gap = 1;
			sorted = true;
		}
		for(i = 0; i + sort_gap < amounts.length; i++){
			if(amounts[i] > amounts[i + sort_gap]){
				[amounts[i], amounts[i + sort_gap], dictionary[i], dictionary[i + sort_gap]] = [amounts[i + sort_gap], amounts[i], dictionary[i + sort_gap], dictionary[i]];
				sorted = false;
			}
		}
	}
	let encodings = [];
	let encoded = [];
	if(dictionary.length < 2){
		encodings[0] = "0";
		encoded[0] = dictionary[0];
	} else {
		while(dictionary.length > 1){
			for(i = 0; i < dictionary[0].length; i++){
				if(encoded.includes(dictionary[0][i]))
					encodings[encoded.indexOf(dictionary[0][i])] = "0" + encodings[encoded.indexOf(dictionary[0][i])];
				else {
					encodings.push("0");
					encoded.push(dictionary[0][i]);
				}
			}
			for(i = 0; i < dictionary[1].length; i++){
				if(encoded.includes(dictionary[1][i]))
					encodings[encoded.indexOf(dictionary[1][i])] = "1" + encodings[encoded.indexOf(dictionary[1][i])];
				else {
					encodings.push("1");
					encoded.push(dictionary[1][i]);
				}
			}
			for(i = 2; i < amounts.length && amounts[i] <= amounts[0] + amounts[1]; i++);
			dictionary.splice(i, 0, dictionary[0] + dictionary[1]);
			amounts.splice(i, 0, amounts[0] + amounts[1]);
			dictionary.splice(0, 2);
			amounts.splice(0, 2);
		}
	}

	sort_gap = encodings.length;
	sorted = false;
	while(!sorted){
		sort_gap = Math.floor(sort_gap / 1.3);
		if(sort_gap < 1){
			sort_gap = 1;
			sorted = true;
		}
		for(i = 0; i + sort_gap < encodings.length; i++){
			if(encodings[i].length > encodings[i + sort_gap].length){
				[encodings[i], encodings[i + sort_gap], encoded[i], encoded[i + sort_gap]] = [encodings[i + sort_gap], encodings[i], encoded[i + sort_gap], encoded[i]];
				sorted = false;
			}
		}
	}
	let canonical_encoding = [];
	let j = 0;
	let max_bits = 0;
	for(i = 0; i < encodings.length; i++){
		let encoded_value = j.toString(2);
		while(encoded_value.length < encodings[i].length)
			encoded_value = "0" + encoded_value;

		if(encoded_value.length > max_bits)
			max_bits = encoded_value.length;

		canonical_encoding[i] = encoded_value;
		j++;
		if(i < encodings.length - 1){
			for(let k = 0; k < encodings[i + 1].length - encodings[i].length; k++)
				j *= 2;
		}
	}

	let output = max_bits.toString(2);
	while(output.length < 4)
		output = "0" + output;
	
	let k = 0, count = 0, old_count = 0;
	for(i = 0, j = 1; i < canonical_encoding.length; i++){
		if(canonical_encoding[i].length == j){
			k++;
			count++;
		} else {
			let min_bits = Math.min((CHARS.length - old_count).toString(2).length, 1 + j);
			old_count = count;
			let temp_binary = k.toString(2);
			while(temp_binary.length < min_bits)
				temp_binary = "0" + temp_binary;

			output += temp_binary;
			j++;
			while(j != canonical_encoding[i].length){
				let min_bits = Math.min((CHARS.length - old_count).toString(2).length, 1 + j);
				let temp_binary = "";
				while(temp_binary.length < min_bits)
					temp_binary = "0" + temp_binary;

				output += temp_binary;
				j++
			}
			k = 1;
			count++;
		}
	}
	let min_bits = Math.min((CHARS.length - old_count).toString(2).length, 1 + j);
	let temp_binary = k.toString(2);
	while(temp_binary.length < min_bits)
		temp_binary = "0" + temp_binary;

	output += temp_binary;

	for(i = 0; i < encoded.length; i++){
		let temp_binary = CHARS.indexOf(encoded[i]).toString(2);
		while(temp_binary.length < CHAR_BITS)
			temp_binary = "0" + temp_binary;
		
		output += temp_binary;
	}

	for(i = 0; i < string.length; i++)
		output += canonical_encoding[encoded.indexOf(string[i])];

	return output;
}

let saveFile = value => {
  let save = JSON.parse(decode(value));
  let userFolders = files[save.u].folders;
  for (const [id, folder] of Object.entries(save.fo)) {
    let newFolder = JSON.stringify(userFolders[id-1]);
    console.log(newFolder);
    folder.forEach(change => {
      newFolder = newFolder.slice(0, change.s+2) + change.t + newFolder.slice(change.e+2);
      console.log(newFolder);
    });
    userFolders[id] = JSON.parse(newFolder);
  }
  files[save.u].folders = userFolders;
  fs.writeFileSync('files.json', JSON.stringify(files));
}

decode("208505168889953172225132758141548505885824527715650366902072322020351066110336369897802092398013558665027530816137120845056525029469608693687539977554015537237026118984740205605731181281118160127313153338470285484109955540985596332401289055615814454737793239127915328108263667845449801760896902956887453601436845538975404702591028669164745089964887471893235022025595520139091699398470387212382099148838536650445819864031118542956322722599817365588148050698220105203791006000840916910105417846613328462837556782962324415616415723869573105977483399784212747670710032936690926855076932663486506014509034575826813738723418414839880005754003237983821342484792784748007928343732067033603759756515533895443784399460854032241686827616407611760367422290344473909774529116613178965070327929685552747664791333539592553997540712245065055854986428937695924566908978663120713243640611500506039342304611335120834248094702890209265984693534106601481981324826648917092558098877232797370506719475512872484265318962096845326085266444870019703791389296106491950192951696349569394817199787605015348840496447082595550164875378421305960092541764547360245395867626622767638662498346092867475713465667258205516711234333827614373603039030892432600306711229185230781576379325158048955634788896463902927694", false, function (data) {
	console.log(data);
});