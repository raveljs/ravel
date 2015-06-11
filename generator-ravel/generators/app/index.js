'use strict';

var generators = require('yeoman-generator');

module.exports = generators.Base.extend({
  initializing: { // - Your initialization methods (checking current project state, getting configs, etc)
  },
  
  prompting: { // - Where you prompt users for options (where you'd call this.prompt())
    getName: function () {
      var done = this.async();
      this.prompt({
        type    : 'input',
        name    : 'name',
        message : 'Your project name',
        store   : true, // Store user answer as a the new default
        default : this.appname // Default to current folder name
      }, function (answers) {
        // do something with answers.name
        this.log(answers.name);
        done();
      }.bind(this));
    }
  },
  
  configuring: { // - Saving configurations and configure the project (creating .editorconfig files and other metadata files)
  },
  
  default: {
  },
  
  writing: { // - Where you write the generator specific files (routes, controllers, etc)
    // Create default directories for modules, resources, routes, and rooms
  },
  
  conflicts: { // - Where conflicts are handled (used internally)
  },
  
  install: { // - Where installation are run (npm, bower)
  },
  
  end: {// - Called last, cleanup, say good bye, etc
  }
});