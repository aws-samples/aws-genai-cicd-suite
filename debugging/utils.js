"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageCodeToName = void 0;
exports.splitContentIntoChunks_deprecated = splitContentIntoChunks_deprecated;
exports.shouldExcludeFile = shouldExcludeFile;
exports.splitIntoSoloFile = splitIntoSoloFile;
exports.extractFunctions = extractFunctions;
exports.exponentialBackoff = exponentialBackoff;
exports.invokeModel = invokeModel;
var client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
// Update the languageCodeToName object with the correct type
exports.languageCodeToName = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
};
// This function splits the content into chunks of maxChunkSize
function splitContentIntoChunks_deprecated(content, maxChunkSize) {
    var chunks = [];
    var currentChunk = '';
    content.split('\n').forEach(function (line) {
        if (currentChunk.length + line.length > maxChunkSize) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += line + '\n';
    });
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}
function shouldExcludeFile(filename, excludePatterns) {
    return excludePatterns.some(function (pattern) {
        var regex = new RegExp("^".concat(pattern.replace(/\*/g, '.*'), "$"));
        return regex.test(filename);
    });
}
function splitIntoSoloFile(combinedCode) {
    // split the whole combinedCode content into individual files (index.ts, index_test.ts, index.js) by recognize the character like: "// File: ./index.ts", filter the content with suffix ".tx" and not contain "test" in file name (index.ts),
    var fileChunks = {};
    var filePattern = /\/\/ File: \.\/(.+)/;
    var currentFile = '';
    var currentContent = '';
    combinedCode.split('\n').forEach(function (line) {
        var match = line.match(filePattern);
        if (match) {
            if (currentFile) {
                fileChunks[currentFile] = currentContent.trim();
            }
            currentFile = match[1];
            currentContent = '';
        }
        else {
            currentContent += line + '\n';
        }
    });
    if (currentFile) {
        fileChunks[currentFile] = currentContent.trim();
    }
    return fileChunks;
}
function extractFunctions(content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]*?)?\s*{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*}/gs;
            // const matches = content.match(functionPattern);
            // return matches ? matches.map(match => match.trim()) : [];
            // Dummy response for debugging purposes
            return [2 /*return*/, [
                    'export async function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]> { ... }',
                    'async function runUnitTests(testCases: TestCase[], sourceCode: string): Promise<void> { ... }',
                    'function generateTestReport(testCases: TestCase[]): Promise<void> { ... }',
                ]];
        });
    });
}
function exponentialBackoff(fn, maxRetries, initialDelay, functionName) {
    return __awaiter(this, void 0, void 0, function () {
        var retries, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    retries = 0;
                    _loop_1 = function () {
                        var result, error_1, delay_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 4]);
                                    return [4 /*yield*/, fn()];
                                case 1:
                                    result = _b.sent();
                                    console.log("Function '".concat(functionName, "' executed successfully on attempt ").concat(retries + 1));
                                    return [2 /*return*/, { value: result }];
                                case 2:
                                    error_1 = _b.sent();
                                    if (retries >= maxRetries) {
                                        console.error("Max retries (".concat(maxRetries, ") reached for function '").concat(functionName, "'. Throwing error."));
                                        throw error_1;
                                    }
                                    delay_1 = initialDelay * Math.pow(2, retries);
                                    console.log("Attempt ".concat(retries + 1, " for function '").concat(functionName, "' failed. Retrying in ").concat(delay_1, "ms..."));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 3:
                                    _b.sent();
                                    retries++;
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// note the default temperature is 1 according to official documentation: https://docs.anthropic.com/en/api/complete
function invokeModel(client_1, modelId_1, payloadInput_1) {
    return __awaiter(this, arguments, void 0, function (client, modelId, payloadInput, temperature) {
        var maxRetries, initialDelay, invokeWithRetry;
        var _this = this;
        if (temperature === void 0) { temperature = 0.6; }
        return __generator(this, function (_a) {
            maxRetries = 3;
            initialDelay = 1000;
            invokeWithRetry = function () { return __awaiter(_this, void 0, void 0, function () {
                var endpoint, payload_1, response, responseBody_1, finalResult, payload, command, apiResponse, decodedResponseBody, responseBody, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            if (!modelId.startsWith("sagemaker.")) return [3 /*break*/, 3];
                            endpoint = modelId.split("sagemaker.")[1];
                            payload_1 = {
                                prompt: payloadInput,
                                parameters: {
                                    max_new_tokens: 256,
                                    temperature: 0.1,
                                },
                            };
                            return [4 /*yield*/, fetch("https://".concat(endpoint), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(payload_1),
                                })];
                        case 1:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 2:
                            responseBody_1 = _a.sent();
                            finalResult = responseBody_1.generated_text;
                            return [2 /*return*/, finalResult];
                        case 3:
                            payload = {
                                anthropic_version: "bedrock-2023-05-31",
                                max_tokens: 4096,
                                temperature: temperature,
                                messages: [
                                    {
                                        role: "user",
                                        content: [{
                                                type: "text",
                                                text: payloadInput,
                                            }],
                                    },
                                ],
                            };
                            command = new client_bedrock_runtime_1.InvokeModelCommand({
                                // modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0"
                                modelId: modelId,
                                contentType: "application/json",
                                body: JSON.stringify(payload),
                            });
                            return [4 /*yield*/, client.send(command)];
                        case 4:
                            apiResponse = _a.sent();
                            decodedResponseBody = new TextDecoder().decode(apiResponse.body);
                            responseBody = JSON.parse(decodedResponseBody);
                            return [2 /*return*/, responseBody.content[0].text];
                        case 5:
                            error_2 = _a.sent();
                            if (error_2 instanceof Error && error_2.name === 'ThrottlingException') {
                                throw error_2; // Allow retry for throttling errors
                            }
                            console.error('Error occurred while invoking the model', error_2);
                            throw error_2; // Throw other errors without retry
                        case 6: return [2 /*return*/];
                    }
                });
            }); };
            return [2 /*return*/, exponentialBackoff(invokeWithRetry, maxRetries, initialDelay, invokeModel.name)];
        });
    });
}
