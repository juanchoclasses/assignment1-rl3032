import Cell from "./Cell";
import SheetMemory from "./SheetMemory";
import { ErrorMessages } from "./GlobalDefinitions";

export type FormulaType = string[];
export type TokenType = string;


/**
 * This class evaluates a formula and returns the result.
 */
export class FormulaEvaluator {
  private _errorOccurred: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _currentTokenIndex: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;
  private _lastResult: number = 0; // Initialized


  /**
   * Initializes the FormulaEvaluator with the provided SheetMemory object.
   * @param memory 
   */
  constructor(memory: SheetMemory) {
      this._sheetMemory = memory;
  }


  /**
   * @returns the current token
   */
  private get currentToken(): TokenType {
      return this._currentFormula[this._currentTokenIndex];
  }


  /**
   * Advances to the next token in the formula.
   */
  private advanceToken(): void {
      this._currentTokenIndex++;
  }


  /**
   * Checks if the current token matches the expected token. If not, sets an error message.
   * @param expected 
   * @returns 
   */
  private matchToken(expected: TokenType): boolean {
      if (this.currentToken === expected) {
          this.advanceToken();
          return true;
      } else {
          this._lastResult = NaN; // Updated
          this._errorMessage = ErrorMessages.invalidFormula;
          return false;
      }
  }


  /**
   * Processes the basic elements in the formula, such as numbers, cell references, 
   * or sub-expressions in parentheses.
   * @returns the value of the basic element
   */
  private factor(): number {
      if (this.isNumber(this.currentToken)) {
          const value = Number(this.currentToken);
          this.advanceToken();
          return value;
      } else if (this.isCellReference(this.currentToken)) {
          const [value, error] = this.getCellValue(this.currentToken);
          if (error) {
              this._lastResult = NaN; // Updated
              this._errorMessage = error;
              this._errorOccurred = true;
          }
          this.advanceToken();
          return value;
      } else if (this.currentToken === '(') {
          this.advanceToken();
          const value = this.expression();
          this.matchToken(')');
          return value;
      } else {
          this._lastResult = NaN; // Updated
          this._errorMessage = ErrorMessages.invalidFormula;
          this._errorOccurred = true;
          return 0;
      }
  }

  /**
   * Processes multiplication and division operations.
   * @returns the value of the term
   */
  private term(): number {
    let value = this.factor();
    while (this.currentToken === '*' || this.currentToken === '/') {
        const op = this.currentToken;
        this.advanceToken();
        if (op === '*') {
            value *= this.factor();
        } else if (op === '/') {
            const divisor = this.factor();
            if (divisor === 0) {
                this._errorMessage = ErrorMessages.divideByZero; 
                this._errorOccurred = true;
                this._lastResult = Infinity;
                return Infinity;
            }
            value /= divisor;
        }
    }
    return value;
  }


  /**
   * Processes addition and subtraction operations.
   * @returns the value of the expression
   */
  private expression(): number {
      let value = this.term();
      while (this.currentToken === '+' || this.currentToken === '-') {
          const op = this.currentToken;
          this.advanceToken();
          if (op === '+') {
              value += this.term();
          } else if (op === '-') {
              value -= this.term();
          }
      }
      return value;
  }


  /**
   * Evaluates the provided formula, returning its numerical result.
   * @param formula 
   */
  public evaluate(formula: FormulaType): number {
      this._currentFormula = formula;
      this._currentTokenIndex = 0;
      this._errorOccurred = false;
      this._errorMessage = "";
      
      if (formula.length === 0) {
          this._errorMessage = ErrorMessages.emptyFormula;
          return 0;
      }

      this._result = this.expression();
      this._lastResult = this._result; // Updated
      if (this._currentTokenIndex !== formula.length && !this._errorOccurred) {
        this._errorMessage = ErrorMessages.invalidFormula;
        return 0;
      }
    
      return this._result;
  }


  /**
   * Getter for the error message.
   */
  public get error(): string {
      return this._errorMessage;
  }


  /**
   * Getter for the result of the formula evaluation.
   */
  public get result(): number {
      return this._result;
  }

  /**
   * Getter for the result of the previous formula evaluation.
   */
  public get lastResult(): number { // Added getter for lastResult
      return this._lastResult;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;