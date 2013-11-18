var _ = require('underscore');
var Tokenizer = require('./tokenizer');
var AnalyzerModule = require('./analyzer');
AnalyzerModule.debug = false;

var Term = AnalyzerModule.Term;
var Expression = AnalyzerModule.Expression;
var ExpressionList = AnalyzerModule.ExpressionList;
var SubroutineCall = AnalyzerModule.SubroutineCall;
var Statement = AnalyzerModule.Statement;
var ClassVarDec = AnalyzerModule.ClassVarDec;
var VarDec = AnalyzerModule.VarDec;
var Type = AnalyzerModule.Type;
var Parameter = AnalyzerModule.Parameter;
var ParameterList = AnalyzerModule.ParameterList;
var SubroutineBody = AnalyzerModule.SubroutineBody;

describe('Integer Constants', function() {

  it("have a minimum value", function() {
    var tokens = getAllTokens('-1');
    expect(Term.consume, tokens).toThrow();
  });

  it("have a maximum value", function() {
    var tokens = getAllTokens('32768');
    expect(Term.consume, tokens).toThrow();
  });

});

describe('Terms', function() {

  it('can be an integerConstant', function() {
    var tokens = getAllTokens('5');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('5');
  });

  it('can be an stringConstant', function() {
    var tokens = getAllTokens('"string!"');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('string!');
  });

  it('can be be some keywordConstants', function() {
    var tokens = getAllTokens('true');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('true');
  });

  it('can be any identifier', function() {
    var tokens = getAllTokens('foo');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('foo');
  });

  it('can be a subroutine call', function() {
    var tokens = getAllTokens('foo()');
    var term = Term.consume(tokens)[0];
    expect(term.content.subroutine.content).toBe('foo');
  });

  it('can unaryOp and then a term', function() {
    var tokens = getAllTokens('-5');
    var term = Term.consume(tokens)[0];
    expect(term.content[0].content).toBe('-');
    expect(term.content.length).toBe(2);
  });

  it('can be an expression in parens', function() {
    var tokens = getAllTokens('(5 * 2)');
    var term = Term.consume(tokens)[0];
    expect(term.content.terms.length).toBe(3);
  });

});

describe("Expressions", function() {

  it("expressions are terms followed by operators paired with a term", function() {
    var tokens = getAllTokens('7 + 5');
    var expression = Expression.consume(tokens)[0];
    expect(expression.terms.length).toBe(3);
  });

  it("trailing ops are not part of the expression", function() {
    var tokens = getAllTokens('7 + 5 -');
    var expression = Expression.consume(tokens)[0];
    expect(expression.terms.length).toBe(3);
  });

});

describe("Expression lists", function() {

  it("can contain any expression split by commas", function() {
    var tokens = getAllTokens('"string", 7, true, false, this, null, foo(), 5 * 5');
    var expressionList = ExpressionList.consume(tokens)[0];
    expect(expressionList.expressions.length).toBe(8);
  });

});

describe('SubroutineCall', function() {

  it('can be called without a class or var', function() {
    var tokens = getAllTokens('foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall.subroutine.content).toBe('foo');
  });

  it('can be called on this', function() {
    var tokens = getAllTokens('this.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall.object.content).toBe('this');
    expect(subroutineCall.subroutine.content).toBe('foo');
  });

  it('cannot be called on most keywords', function() {
    var tokens = getAllTokens('true.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).toBe(null);
  });

  it("except for this", function() {
    var tokens = getAllTokens('this.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('cant be called on classes', function() {
    var tokens = getAllTokens('ClassName.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('can be called on variables', function() {
    var tokens = getAllTokens('bar.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('subroutine calls can have paramaters', function() {
    var tokens = getAllTokens('foo(5)');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
    expect(subroutineCall.expressionList.expressions.length).toBe(1);
  });

});

describe("Statements:", function() {

  describe("Do statements", function() {

    it("are just a call to a subroutine wrapped in 'do' and ';'", function() {
      var tokens = getAllTokens("do foo.bar();");
      var doStatement = Statement.DoStatement.consume(tokens)[0];
      expect(doStatement.tag).toBe('doStatement');
    });

  });

  describe("Let statements", function() {

    it("can assign a value to a varibale", function() {
      var tokens = getAllTokens("let x = 10;");
      var statement = Statement.LetStatement.consume(tokens)[0];
      expect(statement.tag).toBe('letStatement');
    });

  });

  describe("Return statements", function() {

    it("can return an expression", function() {
      _.each(["return 10;", "return a + b;", "return true;"], function(string){
        var tokens = getAllTokens(string);
        var statement = Statement.ReturnStatement.consume(tokens)[0];
        expect(statement.tag).toBe('returnStatement');
      })
    });

  });

  describe("If statements", function() {

    it("can contain single expressions", function() {
      var tokens = getAllTokens("if (true) {let x = 5;}");
      var statement = Statement.IfStatement.consume(tokens)[0];
      expect(statement.tag).toBe('ifStatement');
    });

    it("can contain multiple expressions", function() {
      var tokens = getAllTokens("if (true) {let x = 5; let y = 10;}");
      var statement = Statement.IfStatement.consume(tokens)[0];
      expect(statement.tag).toBe('ifStatement');
      expect(statement.statements.length).toBe(2);
    });

    it("can have else statements", function() {
      var tokens = getAllTokens("if (true) {let x = 5;} else {let x = 10;}");
      var statement = Statement.IfStatement.consume(tokens)[0];
      expect(statement.tag).toBe('ifStatement');
      expect(statement.statements.length).toBe(1);
      expect(statement.elseStatements.length).toBe(1);
    });

  });

  describe("While statements", function() {

    it("have a predicate and statements", function() {
      var tokens = getAllTokens("while (true) {return false;}");
      var statement = Statement.WhileStatement.consume(tokens)[0];
      expect(statement.tag).toBe('whileStatement');
      expect(statement.statements.length).toBe(1);
    });

  });

});

describe("Type", function() {

  it("can use builtin types", function() {
    var tokens = getAllTokens("int");
    var type = Type.consume(tokens)[0];
    expect(type.content).toBe('int');
  });

  it("can be a className", function() {
    var tokens = getAllTokens("ClassName");
    var type = Type.consume(tokens)[0];
    expect(type.content).toBe('ClassName');
  });

});

describe("classVarDec", function() {

  it("can be static", function() {
    var tokens = getAllTokens("static Square square;");
    var classVarDec = ClassVarDec.consume(tokens)[0];
    expect(classVarDec.decorator.content).toBe('static');
  });

  it("can be field", function() {
    var tokens = getAllTokens("field Square square;");
    var classVarDec = ClassVarDec.consume(tokens)[0];
    expect(classVarDec.decorator.content).toBe('field');
  });

});

describe("VarDec", function() {

  it("are a lot like classVarDecs except without a decorator", function() {
    var tokens = getAllTokens("var Square square;");
    var classVarDec = VarDec.consume(tokens)[0];
    expect(classVarDec.type.content).toBe('Square');
    expect(classVarDec.varName.content).toBe('square');
  });

});

describe("Parameters", function() {

  it("are just types followed by a varName", function() {
    var tokens = getAllTokens("int x");
    var parameter = Parameter.consume(tokens)[0];
    expect(parameter.type.content).toBe('int');
    expect(parameter.varName.content).toBe('x');
  });

  it("can be strung together in a parameter list", function() {
    var tokens = getAllTokens("int x, char a, boolean b");
    var parameterList = ParameterList.consume(tokens)[0];
    expect(parameterList.parameters.length).toBe(3);
  });

});

describe("SubroutineBody", function() {

  it("can contain var decs and statements", function() {
    var tokens = getAllTokens("{var Square x; let x = 100;}");
    var subroutineBody = SubroutineBody.consume(tokens)[0];
    expect(subroutineBody.varDecs.length).toBe(1);
    expect(subroutineBody.statements.length).toBe(1);
  });

});

// Helper method to that gets all tokens from a string
function getAllTokens(string) {
  var tokenizer = new Tokenizer(string);

  var tokens = [];
  while (tokenizer.hasMoreText()) {
    tokenizer.advance();
    tokens.push(tokenizer.currentToken);
  }
  return tokens;
}
