'use strict';

var chai = require('chai'),
    fs = require('fs'),
    prepareBootstrap = require('../../lib/dynamic-bootstrap').prepareBootstrap,
    logger = require('../../lib/logger'),
    Q = require('q'),
    rimraf = Q.denodeify(require('rimraf')),
    sinon = require('sinon'),
    sinonChai = require("sinon-chai");

chai.should();
chai.use(sinonChai);

describe('dynamic bootstrap', function () {
  function envFromCode(code) {
    /* jshint unused:false */
    var bootstrap = function (env) {
      return env;
    };
    /* jshint evil:true */
    return eval(code.replace(/#import.*/g, ''));
  }

  function checkCode(code) {
    code.should.match(/#import/);
    /* jshint evil:true */
    var env = envFromCode(code);
    env.nodePath.should.equal(process.execPath);
    env.commandProxyClientPath.should.exist;
    fs.existsSync(env.commandProxyClientPath).should.be.ok;
  }

  before(function () {
    sinon.spy(logger, "debug");
  });

  after(function () {
    logger.debug.restore();
  });

  it('should generate dynamic bootstrap', function (done) {
    process.env.APPIUM_BOOTSTRAP_DIR = '/tmp/appium-uiauto/test/unit/bootstrap';
    rimraf(process.env.APPIUM_BOOTSTRAP_DIR)
      // first call: should create new bootstrap file
      .then(function () { return prepareBootstrap(); })
      .then(function (bootstrapFile) {
        bootstrapFile.should.match(/\/tmp\/appium-uiauto\/test\/unit\/bootstrap\/bootstrap\-.*\.js/);
        var code = fs.readFileSync(bootstrapFile, 'utf8');
        checkCode(code);
      })
      .then(function () {
        logger.debug.calledWithMatch(/Creating or overwritting dynamic bootstrap/).should.be.ok;
        logger.debug.reset();
      })
      // second call: should reuse bootstrap file
      .then(function () { return prepareBootstrap(); })
      .then(function (bootstrapFile) {
        bootstrapFile.should.match(/\/tmp\/appium-uiauto\/test\/unit\/bootstrap\/bootstrap\-.*\.js/);
        var code = fs.readFileSync(bootstrapFile, 'utf8');
        checkCode(code);
      }).then(function () {
        logger.debug.calledWithMatch(/Reusing dynamic bootstrap/).should.be.ok;
        logger.debug.reset();
      })
      // third call with extra imports: should create different bootstrap file
      .then(function () {
        var imports = {pre: ['dir1/alib.js'] };
        return prepareBootstrap({imports: imports});
      }).then(function (bootstrapFile) {
        bootstrapFile.should.match(/\/tmp\/appium-uiauto\/test\/unit\/bootstrap\/bootstrap\-.*\.js/);
        var code = fs.readFileSync(bootstrapFile, 'utf8');
        code.should.match(/#import "dir1\/alib.js";/);
        checkCode(code, {isVerbose: true, gracePeriod: 5});
      })
      .then(function () {
        logger.debug.calledWithMatch(/Creating or overwritting dynamic bootstrap/).should.be.ok;
        logger.debug.reset();
      })
      .nodeify(done);
  });

});
