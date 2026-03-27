class TerminalResume {
  constructor() {
    this.output = document.getElementById("output");
    this.input = document.getElementById("command-input");
    this.terminal = document.querySelector(".terminal");
    this.terminalContainer = document.querySelector(".terminal-container");
    this.contextMenu = document.querySelector(".context-menu");
    this.terminals = [{ input: this.input, history: [], historyIndex: -1 }];
    this.activeTerminal = 0;
    this.activeTerminalContent = null;
    this.resizing = null;

    this.currentTheme = localStorage.getItem("theme") || "default";
    this.projects = [];
    this.skills = {};
    this.fileSystem = {};
    this.gameActive = false;
    this.gameHandler = null;

    this.themeModal = document.getElementById("theme-modal");
    this.projectsModal = document.getElementById("projects-modal");
    this.skillsModal = document.getElementById("skills-modal");
    this.themeToggle = document.getElementById("theme-toggle");

    this.setupEventListeners();
    this.loadProjects();
    this.loadSkills();
    this.setupFileSystem();
    this.init();
  }

  init() {
    this.handleThemeChange(this.currentTheme);

    document.querySelectorAll(".close-button").forEach((button) => {
      button.addEventListener("click", () => {
        this.closeModal(button.closest(".modal"));
      });
    });

    this.themeToggle.addEventListener("click", () => {
      this.showModal(this.themeModal);
    });

    const languageToggle = document.getElementById("language-toggle");
    if (languageToggle && languageToggle.parentElement) {
      languageToggle.parentElement.style.display = "none";
    }

    document.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        this.handleThemeChange(option.dataset.theme);
      });
    });

    this.printWelcomeMessage();
    this.input.focus();
    this.setupContextMenu();
  }

  setupContextMenu() {
    this.terminalContainer.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        this.activeTerminalContent = terminalContent;
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    document.addEventListener("click", () => {
      this.contextMenu.classList.remove("active");
    });

    this.contextMenu.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action);
      }
    });
  }

  showContextMenu(x, y) {
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    const closeOption = this.contextMenu.querySelector('[data-action="close-split"]');
    const isMainTerminal = this.activeTerminalContent === this.terminalContainer.firstElementChild;
    closeOption.style.display = isMainTerminal ? "none" : "block";
  }

  handleContextMenuAction(action) {
    if (!this.activeTerminalContent) return;
    switch (action) {
      case "split-h":
        this.splitTerminal("horizontal", this.activeTerminalContent);
        break;
      case "split-v":
        this.splitTerminal("vertical", this.activeTerminalContent);
        break;
      case "close-split":
        this.closeSplit(this.activeTerminalContent);
        break;
    }
    this.contextMenu.classList.remove("active");
  }

  setupEventListeners() {
    this.terminalContainer.addEventListener("click", (e) => {
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        const input = terminalContent.querySelector("input");
        if (input) {
          input.focus();
          this.activeTerminal = this.terminals.findIndex((t) => t.input === input);
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const activeContent = this.terminals[this.activeTerminal].input.closest(".terminal-content");
        if (activeContent) this.splitTerminal("horizontal", activeContent);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const activeContent = this.terminals[this.activeTerminal].input.closest(".terminal-content");
        if (activeContent) this.splitTerminal("vertical", activeContent);
      }
    });

    this.setupInputHandlers(this.input);
  }

  setupInputHandlers(inputElement) {
    inputElement.addEventListener("keydown", (e) => {
      const terminal = this.terminals.find((t) => t.input === inputElement);
      if (!terminal) return;

      if (e.key === "Enter") {
        this.handleCommand(inputElement);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateHistory("up", terminal);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateHistory("down", terminal);
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.handleTabCompletion(inputElement);
      }
    });
  }

  handleTabCompletion(inputElement) {
    const currentInput = inputElement.value.toLowerCase().trim();
    const commands = ["help","about","skills","projects","education","contact","clear","skills-visual","game","exit-game","matrix","stop-matrix","calc","calculate"];
    const matches = commands.filter((cmd) => cmd.startsWith(currentInput));
    if (matches.length === 1) {
      inputElement.value = matches[0];
    } else if (matches.length > 1 && currentInput) {
      const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");
      this.printToOutput(outputElement, `\nPossible commands:\n${matches.join("  ")}`, "info");
    }
  }

  navigateHistory(direction, terminal) {
    if (direction === "up" && terminal.historyIndex < terminal.history.length - 1) {
      terminal.historyIndex++;
    } else if (direction === "down" && terminal.historyIndex > -1) {
      terminal.historyIndex--;
    }
    if (terminal.historyIndex >= 0 && terminal.historyIndex < terminal.history.length) {
      terminal.input.value = terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    } else {
      terminal.input.value = "";
    }
  }

  splitTerminal(direction, sourceTerminal) {
    const parentContainer = sourceTerminal.parentElement;
    const isAlreadySplit = parentContainer.children.length > 1;
    const splitClass = direction === "horizontal" ? "split-h" : "split-v";

    if (!isAlreadySplit || !parentContainer.classList.contains(splitClass)) {
      const newContainer = document.createElement("div");
      newContainer.className = `terminal-container ${splitClass}`;
      sourceTerminal.parentElement.insertBefore(newContainer, sourceTerminal);
      newContainer.appendChild(sourceTerminal);
      this.createNewTerminalContent(newContainer);
    } else {
      this.createNewTerminalContent(parentContainer);
    }
  }

  createNewTerminalContent(container) {
    const newContent = document.createElement("div");
    newContent.className = "terminal-content";
    const timestamp = Date.now();
    newContent.innerHTML = `
      <div id="output-${timestamp}" class="terminal-output"></div>
      <div class="input-line">
        <span class="prompt">➜</span>
        <input type="text" id="command-input-${timestamp}" class="command-input" />
      </div>
    `;

    if (container.children.length > 0) {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${container.classList.contains("split-h") ? "horizontal" : "vertical"}`;
      container.lastElementChild.appendChild(handle);
      this.setupResizeHandle(handle);
    }

    container.appendChild(newContent);
    const newInput = newContent.querySelector(".command-input");
    this.setupInputHandlers(newInput);
    this.terminals.push({ input: newInput, history: [], historyIndex: -1 });
    const newOutput = newContent.querySelector(`#output-${timestamp}`);
    this.printWelcomeMessage(newOutput);
    newInput.focus();
    this.activeTerminal = this.terminals.length - 1;
  }

  setupResizeHandle(handle) {
    const isHorizontal = handle.classList.contains("horizontal");
    const startResize = (e) => {
      e.preventDefault();
      this.resizing = {
        handle, startX: e.clientX, startY: e.clientY,
        parentContainer: handle.closest(".terminal-container"),
        element: handle.parentElement,
        initialSize: isHorizontal ? handle.parentElement.offsetWidth : handle.parentElement.offsetHeight,
      };
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!this.resizing) return;
      const { parentContainer, element, startX, startY, initialSize } = this.resizing;
      const containerRect = parentContainer.getBoundingClientRect();
      if (isHorizontal) {
        const deltaX = e.clientX - startX;
        const newWidth = initialSize + deltaX;
        const maxWidth = containerRect.width - 150;
        if (newWidth >= 150 && newWidth <= maxWidth) {
          element.style.flex = "none";
          element.style.width = `${(newWidth / containerRect.width) * 100}%`;
        }
      } else {
        const deltaY = e.clientY - startY;
        const newHeight = initialSize + deltaY;
        const maxHeight = containerRect.height - 100;
        if (newHeight >= 100 && newHeight <= maxHeight) {
          element.style.flex = "none";
          element.style.height = `${(newHeight / containerRect.height) * 100}%`;
        }
      }
    };

    const stopResize = () => {
      this.resizing = null;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };
    handle.addEventListener("mousedown", startResize);
  }

  printToOutput(outputElement, text, className = "", useTypewriter = false) {
    if (!text) { outputElement.innerHTML = ""; return Promise.resolve(); }
    const line = document.createElement("div");
    line.className = className;
    line.style.whiteSpace = "pre-wrap";
    line.style.marginBottom = "0.5rem";
    outputElement.appendChild(line);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
    if (useTypewriter && !text.includes("<")) {
      return this.typeText(line, text, 20);
    } else if (useTypewriter && text.includes("<")) {
      return this.typeHTML(line, text, 20);
    } else {
      line.textContent = text;
      return Promise.resolve();
    }
  }

  scrollToBottom(terminalContent) {
    if (!terminalContent) return;
    if (terminalContent.scrollHeight > terminalContent.clientHeight) {
      const maxScroll = terminalContent.scrollHeight - terminalContent.clientHeight;
      if (terminalContent.scrollTop < maxScroll) {
        terminalContent.scrollTop = maxScroll;
        requestAnimationFrame(() => { terminalContent.scrollTop = maxScroll; });
      }
    }
  }

  handleCommand(inputElement) {
    const terminal = this.terminals.find((t) => t.input === inputElement);
    if (!terminal) return;
    const command = inputElement.value.trim().toLowerCase();
    const outputElement = inputElement.closest(".terminal-content").querySelector("[id^='output']");
    this.printToOutput(outputElement, `➜ ${command}`, "command");
    terminal.history.push(command);
    terminal.historyIndex = -1;
    inputElement.value = "";
    const [cmd, ...args] = command.split(" ");

    switch (cmd) {
      case "help": this.showHelp(outputElement); break;
      case "about": this.showAbout(outputElement); break;
      case "projects": this.showProjects(outputElement); break;
      case "education": this.showEducation(outputElement); break;
      case "skills": this.showSkills(outputElement); break;
      case "skills-visual": this.showSkillsVisualization(); break;
      case "contact": this.showContact(outputElement); break;
      case "clear":
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
        break;
      case "game": this.initGame(); break;
      case "exit-game":
        this.endGame();
        this.printToOutput(outputElement, "Game exited.", "info");
        break;
      case "matrix": this.startMatrixEffect(outputElement); break;
      case "stop-matrix":
        this.stopMatrixEffect();
        this.printToOutput(outputElement, "Matrix effect stopped.", "info");
        break;
      case "calc":
      case "calculate": this.calculate(args.join(" "), outputElement); break;
      case "": break;
      default:
        this.printToOutput(outputElement, `Command not found: ${command}. Type 'help' for available commands.`, "error");
    }
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  printWelcomeMessage(outputElement = this.output) {
    const asciiArt = `███████╗ █████╗ ███╗   ██╗     ██╗ █████╗ ██╗
██╔════╝██╔══██╗████╗  ██║     ██║██╔══██╗██║
███████╗███████║██╔██╗ ██║     ██║███████║██║
╚════██║██╔══██║██║╚██╗██║██   ██║██╔══██║██║
███████║██║  ██║██║ ╚████║╚█████╔╝██║  ██║██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═╝╚═╝`;

    const divider = "─────────────────────────────────────────────────";

    const welcome =
      this.wrapWithColor(asciiArt + "\n", "#66d9ef") +
      this.wrapWithColor(divider + "\n", "#555555") +
      this.wrapWithColor("         Full-Stack & Python Developer\n", "#888888") +
      this.wrapWithColor("     Django • Node.js • React • REST APIs\n", "#666666") +
      this.wrapWithColor(divider + "\n\n", "#555555") +
      this.wrapWithColor("Type ", "#666666") +
      this.wrapWithColor("'help'", "#87af87") +
      this.wrapWithColor(" to see available commands\n", "#666666") +
      this.wrapWithColor("Press ", "#666666") +
      this.wrapWithColor("'tab'", "#87af87") +
      this.wrapWithColor(" to auto-complete commands", "#666666");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = welcome;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showHelp(outputElement = this.output) {
    const title = this.wrapWithColor("🚀 Available Commands\n\n", "#ffff00");

    const mainCommands =
      this.wrapWithColor("Main Commands:\n", "#00ffff") +
      this.wrapWithColor("• help", "#98fb98") + "       " + this.wrapWithColor("Show this help message\n", "#ffffff") +
      this.wrapWithColor("• about", "#98fb98") + "      " + this.wrapWithColor("Display my professional summary\n", "#ffffff") +
      this.wrapWithColor("• skills", "#98fb98") + "     " + this.wrapWithColor("View my technical skills\n", "#ffffff") +
      this.wrapWithColor("• projects", "#98fb98") + "   " + this.wrapWithColor("Show my project portfolio\n", "#ffffff") +
      this.wrapWithColor("• education", "#98fb98") + "  " + this.wrapWithColor("View my educational background\n", "#ffffff") +
      this.wrapWithColor("• contact", "#98fb98") + "    " + this.wrapWithColor("Get my contact information\n", "#ffffff") +
      this.wrapWithColor("• clear", "#98fb98") + "      " + this.wrapWithColor("Clear the terminal screen\n", "#ffffff");

    const utilityCommands =
      "\n" +
      this.wrapWithColor("Utility Commands:\n", "#00ffff") +
      this.wrapWithColor("• skills-visual", "#98fb98") + " " + this.wrapWithColor("Show skills visualization\n", "#ffffff") +
      this.wrapWithColor("• game", "#98fb98") + "       " + this.wrapWithColor("Play Snake mini-game\n", "#ffffff") +
      this.wrapWithColor("• matrix", "#98fb98") + "    " + this.wrapWithColor("Start Matrix digital rain effect\n", "#ffffff") +
      this.wrapWithColor("• calc", "#98fb98") + "      " + this.wrapWithColor("Calculate mathematical expressions\n", "#ffffff");

    const shortcuts =
      "\n" +
      this.wrapWithColor("Shortcuts:\n", "#666666") +
      this.wrapWithColor("• ↑/↓         ", "#666666") + this.wrapWithColor("Navigate command history\n", "#444444") +
      this.wrapWithColor("• Tab         ", "#666666") + this.wrapWithColor("Auto-complete commands\n", "#444444") +
      this.wrapWithColor("• Ctrl+L      ", "#666666") + this.wrapWithColor("Clear the screen\n", "#444444") +
      this.wrapWithColor("• Ctrl+Shift+H ", "#666666") + this.wrapWithColor("Split horizontally\n", "#444444") +
      this.wrapWithColor("• Ctrl+Shift+V ", "#666666") + this.wrapWithColor("Split vertically", "#444444");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = title + mainCommands + utilityCommands + shortcuts;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showAbout(outputElement = this.output) {
    const about = `<span style="color: #ffd93d; font-weight: bold;">✨ About Me</span>

${this.wrapWithColor("┌─────────────────────────────────────────────────────────┐", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")} ${this.wrapWithColor("Sanjaikumar A — Full-Stack & Python Developer", "#ffffff")}       ${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")} ${this.wrapWithColor("Based in Velachery, Chennai — 600042", "#ffffff")}               ${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("└─────────────────────────────────────────────────────────┘", "#ffd93d")}

${this.wrapWithColor("⚡ Profile", "#ffd93d")}
${this.wrapWithColor("   Entry-level Python and Full-Stack Developer with", "#ffffff")}
${this.wrapWithColor("   hands-on experience in Django, Node.js, and REST API", "#ffffff")}
${this.wrapWithColor("   development.", "#ffffff")}

${this.wrapWithColor("⚡ Strengths", "#ffd93d")}
${this.wrapWithColor("   Skilled in building scalable backend systems,", "#ffffff")}
${this.wrapWithColor("   implementing secure JWT authentication, and data analysis.", "#ffffff")}

${this.wrapWithColor("⚡ Passion", "#ffd93d")}
${this.wrapWithColor("   Passionate about problem solving and developing", "#ffffff")}
${this.wrapWithColor("   real-world applications with clean, maintainable code.", "#ffffff")}

${this.wrapWithColor("⚡ Education", "#ffd93d")}
${this.wrapWithColor("   BE Mechanical Engineering, M.A.M. School of Engineering", "#ffffff")}
${this.wrapWithColor("   CGPA: 7.1", "#66d9ef")}

${this.wrapWithColor("╭───────────────────────────────────────────────────────╮", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")} ${this.wrapWithColor("Ready to bring your innovative ideas to life!", "#ffffff")} ${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("╰───────────────────────────────────────────────────────╯", "#ffd93d")}`;

    const aboutDiv = document.createElement("div");
    aboutDiv.innerHTML = about;
    outputElement.appendChild(aboutDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showProjects(outputElement = this.output) {
    const projects = `<span style="color: #ffff00; font-weight: bold;">📁 Project Portfolio</span>

<span style="color: #00ffff;">1. EVENT MANAGEMENT PLATFORM</span>
${this.wrapWithColor("   Stack: Node.js · Express.js · MySQL · JWT · Nodemailer", "#87cefa")}
${this.wrapWithColor("   • Scalable event management & ticket booking platform", "#ffffff")}
${this.wrapWithColor("   • JWT-based auth + role-based access (organizer/attendee)", "#ffffff")}
${this.wrapWithColor("   • Automated email notifications via Nodemailer", "#ffffff")}
${this.wrapWithColor("   • OOP-based clean, maintainable architecture", "#ffffff")}

<span style="color: #00ffff;">2. STOCK MARKET STRATEGY BACKTESTING SYSTEM</span>
${this.wrapWithColor("   Stack: Django · Pandas · NumPy · yFinance · Matplotlib", "#87cefa")}
${this.wrapWithColor("   • Django web app for stock market analysis & backtesting", "#ffffff")}
${this.wrapWithColor("   • Supertrend + Heikin Ashi for buy/sell signal generation", "#ffffff")}
${this.wrapWithColor("   • Interactive data visualizations with Matplotlib", "#ffffff")}
${this.wrapWithColor("   • Modular Django architecture for scalability", "#ffffff")}

<span style="color: #00ffff;">3. E-COMMERCE PRODUCT CATALOG MANAGEMENT</span>
${this.wrapWithColor("   Stack: Node.js · Express.js · MySQL · Swagger · JWT", "#87cefa")}
${this.wrapWithColor("   • Multi-role access: admin, vendor, customer", "#ffffff")}
${this.wrapWithColor("   • RESTful APIs documented via Swagger", "#ffffff")}
${this.wrapWithColor("   • Third-party integrations: logistics, analytics, email", "#ffffff")}
${this.wrapWithColor("   • JWT session management", "#ffffff")}

${this.wrapWithColor("🔗 GitHub: ", "#ffd93d")}${this.wrapWithColor('<a href="https://github.com/SANJUIKUMAR" target="_blank" style="color:#66d9ef;text-decoration:none;">github.com/SANJUIKUMAR</a>', "#66d9ef")}`;

    const projectsDiv = document.createElement("div");
    projectsDiv.innerHTML = projects;
    outputElement.appendChild(projectsDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showEducation(outputElement = this.output) {
    const education = `<span style="color: #ffd93d; font-weight: bold;">🎓 Education & Certification</span>

${this.wrapWithColor("┌──────────────────────────────────────────────────────┐", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")}${this.wrapWithColor(" Bachelor of Engineering — Mechanical Engineering ", "#ffffff")}${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("└──────────────────────────────────────────────────────┘", "#ffd93d")}

${this.wrapWithColor("🏛️  Institution:", "#ffd93d")} ${this.wrapWithColor("M.A.M. School of Engineering", "#ffffff")}
${this.wrapWithColor("📍  Location:", "#ffd93d")}    ${this.wrapWithColor("Tamil Nadu, India", "#ffffff")}
${this.wrapWithColor("📊  CGPA:", "#ffd93d")}        ${this.wrapWithColor("7.1", "#66d9ef")}

${this.wrapWithColor("┌──────────────────────────────────────────────────────┐", "#a8e6cf")}
${this.wrapWithColor("│", "#a8e6cf")}${this.wrapWithColor("   Course Completed Certificate                       ", "#ffffff")}${this.wrapWithColor("│", "#a8e6cf")}
${this.wrapWithColor("└──────────────────────────────────────────────────────┘", "#a8e6cf")}

${this.wrapWithColor("📜  Course:", "#a8e6cf")}    ${this.wrapWithColor("Python Django Developer", "#ffffff")}
${this.wrapWithColor("🏢  Institute:", "#a8e6cf")} ${this.wrapWithColor("LOGIN360 IT Solutions", "#ffffff")}
${this.wrapWithColor("📅  Period:", "#a8e6cf")}    ${this.wrapWithColor("Sep 2025 – Jan 2026", "#ffffff")}

${this.wrapWithColor("╭──────────────────────────────────────────────────────╮", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")}${this.wrapWithColor(" Foundation of my full-stack development journey.     ", "#ffffff")}${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("╰──────────────────────────────────────────────────────╯", "#ffd93d")}`;

    const educationDiv = document.createElement("div");
    educationDiv.innerHTML = education;
    outputElement.appendChild(educationDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showSkills(outputElement = this.output) {
    const skills = `<span style="color: #ffff00; font-weight: bold;">🛠️ Technical Skills</span>

${this.wrapWithColor("Languages:", "#00ffff")}
• ${this.wrapWithColor("Python", "#ffffff")}   • ${this.wrapWithColor("JavaScript", "#ffffff")}   • ${this.wrapWithColor("HTML", "#ffffff")}   • ${this.wrapWithColor("CSS", "#ffffff")}

${this.wrapWithColor("Backend:", "#00ffff")}
• ${this.wrapWithColor("Django", "#ffffff")}   • ${this.wrapWithColor("Node.js", "#ffffff")}   • ${this.wrapWithColor("Express.js", "#ffffff")}   • ${this.wrapWithColor("REST APIs", "#ffffff")}   • ${this.wrapWithColor("JWT Auth", "#ffffff")}   • ${this.wrapWithColor("Swagger", "#ffffff")}

${this.wrapWithColor("Frontend:", "#00ffff")}
• ${this.wrapWithColor("React.js", "#ffffff")}   • ${this.wrapWithColor("Bootstrap", "#ffffff")}   • ${this.wrapWithColor("HTML5", "#ffffff")}   • ${this.wrapWithColor("CSS3", "#ffffff")}

${this.wrapWithColor("Databases:", "#00ffff")}
• ${this.wrapWithColor("MySQL", "#ffffff")}   • ${this.wrapWithColor("PostgreSQL", "#ffffff")}

${this.wrapWithColor("Data & Analysis:", "#00ffff")}
• ${this.wrapWithColor("Pandas", "#ffffff")}   • ${this.wrapWithColor("NumPy", "#ffffff")}   • ${this.wrapWithColor("Matplotlib", "#ffffff")}   • ${this.wrapWithColor("yFinance", "#ffffff")}

${this.wrapWithColor("Tools:", "#00ffff")}
• ${this.wrapWithColor("Git", "#ffffff")}   • ${this.wrapWithColor("GitHub", "#ffffff")}   • ${this.wrapWithColor("VSCode", "#ffffff")}   • ${this.wrapWithColor("PyCharm", "#ffffff")}   • ${this.wrapWithColor("Nodemailer", "#ffffff")}`;

    const skillsDiv = document.createElement("div");
    skillsDiv.innerHTML = skills;
    outputElement.appendChild(skillsDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showContact(outputElement = this.output) {
    const contact = `<span style="color: #ffd93d; font-weight: bold;">📫 Contact Information</span>

${this.wrapWithColor("┌────────────────────────────────────────┐", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")} ${this.wrapWithColor("Let's connect and build something great!", "#ffffff")} ${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("└────────────────────────────────────────┘", "#ffd93d")}

${this.wrapWithColor("✉", "#ffd93d")}  ${this.wrapWithColor("Email:", "#ffd93d")} ${this.wrapWithColor('<a href="mailto:sachinsanjai545@gmail.com" style="color:#ffffff;text-decoration:none;">sachinsanjai545@gmail.com</a>', "#ffffff")}

${this.wrapWithColor("📱", "#ffd93d")}  ${this.wrapWithColor("Phone:", "#ffd93d")} ${this.wrapWithColor('+91 97919 28406', "#ffffff")}

${this.wrapWithColor("⚡", "#ffd93d")}  ${this.wrapWithColor("Github:", "#ffd93d")} ${this.wrapWithColor('<a href="https://github.com/SANJUIKUMAR" target="_blank" style="color:#ffffff;text-decoration:none;">github.com/SANJUIKUMAR</a>', "#ffffff")}

${this.wrapWithColor("💼", "#ffd93d")}  ${this.wrapWithColor("LinkedIn:", "#ffd93d")} ${this.wrapWithColor('<a href="https://www.linkedin.com/in/SANJUIKUMAR" target="_blank" style="color:#ffffff;text-decoration:none;">linkedin.com/in/SANJUIKUMAR</a>', "#ffffff")}

${this.wrapWithColor("📍", "#ffd93d")}  ${this.wrapWithColor("Location:", "#ffd93d")} ${this.wrapWithColor("Velachery, Chennai — 600042, India", "#ffffff")}

${this.wrapWithColor("╭────────────────────────────────────────╮", "#ffd93d")}
${this.wrapWithColor("│", "#ffd93d")} ${this.wrapWithColor("Feel free to reach out for opportunities!", "#ffffff")} ${this.wrapWithColor("│", "#ffd93d")}
${this.wrapWithColor("╰────────────────────────────────────────╯", "#ffd93d")}`;

    const contactDiv = document.createElement("div");
    contactDiv.innerHTML = contact;
    outputElement.appendChild(contactDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  wrapWithColor(text, color) {
    return `<span style="color: ${color}">${text}</span>`;
  }

  typeText(element, text, speed = 30) {
    if (!element || !text) return Promise.resolve();
    return new Promise((resolve) => {
      let index = 0;
      element.textContent = "";
      element.style.display = "inline-block";
      const interval = setInterval(() => {
        if (index < text.length) { element.textContent += text.charAt(index); index++; }
        else { clearInterval(interval); resolve(); }
      }, speed);
    });
  }

  async typeHTML(element, html, speed = 30) {
    if (!element || !html) return Promise.resolve();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
    const nodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) { nodes.push(currentNode); }
    element.innerHTML = "";
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const span = document.createElement("span");
        element.appendChild(span);
        await this.typeText(span, node.textContent, speed);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        element.appendChild(clone);
        if (node.tagName === "STYLE" || !node.hasChildNodes()) { clone.innerHTML = node.innerHTML; }
      }
    }
    return Promise.resolve();
  }

  closeSplit(terminalContent) {
    const container = terminalContent.parentElement;
    const input = terminalContent.querySelector("input");
    const terminalIndex = this.terminals.findIndex((t) => t.input === input);
    if (terminalIndex > -1) this.terminals.splice(terminalIndex, 1);
    terminalContent.remove();
    if (container.children.length <= 1 && container !== this.terminalContainer) {
      if (container.children.length === 1) {
        const remainingContent = container.firstElementChild;
        container.parentElement.insertBefore(remainingContent, container);
      }
      container.remove();
    }
    if (this.terminals.length > 0) {
      const newActiveIndex = Math.min(terminalIndex, this.terminals.length - 1);
      this.terminals[newActiveIndex].input.focus();
      this.activeTerminal = newActiveIndex;
    }
  }

  loadProjects() {
    this.projects = [
      { title: "Event Management Platform", description: "Scalable event & ticket booking with JWT auth", technologies: ["Node.js", "Express.js", "MySQL", "JWT"], demo: "#", repo: "https://github.com/SANJUIKUMAR" },
      { title: "Stock Market Backtesting", description: "Django app for stock analysis with Supertrend indicators", technologies: ["Django", "Pandas", "NumPy", "Matplotlib"], demo: "#", repo: "https://github.com/SANJUIKUMAR" },
      { title: "E-Commerce Catalog Management", description: "Multi-role backend with Swagger-documented APIs", technologies: ["Node.js", "Express.js", "MySQL", "Swagger"], demo: "#", repo: "https://github.com/SANJUIKUMAR" },
    ];
  }

  loadSkills() {
    this.skills = {
      Backend: { Django: 85, "Node.js": 80, "Express.js": 78, "REST APIs": 88 },
      Languages: { Python: 85, JavaScript: 80, HTML: 90, CSS: 75 },
      Databases: { MySQL: 80, PostgreSQL: 72 },
      "Data & Analysis": { Pandas: 75, NumPy: 72, Matplotlib: 70 },
    };
  }

  setupFileSystem() {
    this.fileSystem = {
      resume: {
        type: "directory",
        contents: {
          "about.txt": { type: "file", content: "Sanjaikumar A - Full-Stack & Python Developer" },
          "skills.md": { type: "file", content: "# Skills: Python, Django, Node.js, React..." },
        },
      },
    };
  }

  handleThemeChange(theme) {
    this.terminal.className = `terminal theme-${theme}`;
    localStorage.setItem("theme", theme);
    this.currentTheme = theme;
    this.closeModal(this.themeModal);
  }

  showModal(modal) { modal.classList.add("active"); }
  closeModal(modal) { modal.classList.remove("active"); }

  showProjects() {
    const container = this.projectsModal.querySelector(".projects-container");
    container.innerHTML = this.projects.map((project) => `
      <div class="project-card">
        <div class="project-details">
          <h3 class="project-title">${project.title}</h3>
          <p class="project-description">${project.description}</p>
          <div class="project-tech">${project.technologies.map((tech) => `<span class="tech-tag">${tech}</span>`).join("")}</div>
          <div class="project-links">
            <a href="${project.repo}" class="project-link" target="_blank"><i class="fab fa-github"></i> Repository</a>
          </div>
        </div>
      </div>
    `).join("");
    this.showModal(this.projectsModal);
  }

  showSkillsVisualization() {
    const container = this.skillsModal.querySelector(".skills-container");
    container.innerHTML = Object.entries(this.skills).map(([category, skills]) => `
      <div class="skill-category">
        <h3 class="skill-category-title">${category}</h3>
        <div class="skill-bars">
          ${Object.entries(skills).map(([skill, level]) => `
            <div class="skill-item">
              <div class="skill-info">
                <span class="skill-name">${skill}</span>
                <span class="skill-level">${level}%</span>
              </div>
              <div class="skill-progress">
                <div class="skill-progress-bar" style="width: ${level}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
    this.showModal(this.skillsModal);
  }

  // Matrix rain effect
  startMatrixEffect(outputElement) {
    if (this.matrixInterval) this.stopMatrixEffect();
    const canvas = document.createElement("canvas");
    canvas.width = 500; canvas.height = 200;
    canvas.style.display = "block";
    outputElement.appendChild(canvas);
    this.matrixCanvas = canvas;
    const ctx = canvas.getContext("2d");
    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);
    this.matrixInterval = setInterval(() => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#66d9ef";
      ctx.font = "14px monospace";
      drops.forEach((y, i) => {
        const text = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(text, i * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }, 33);
    this.printToOutput(outputElement, "Matrix started. Type 'stop-matrix' to stop.", "info");
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  stopMatrixEffect() {
    if (this.matrixInterval) { clearInterval(this.matrixInterval); this.matrixInterval = null; }
    if (this.matrixCanvas) { this.matrixCanvas.remove(); this.matrixCanvas = null; }
  }

  calculate(expression, outputElement) {
    if (!expression) { this.printToOutput(outputElement, "Usage: calc <expression>  e.g. calc 2+2*5", "info"); return; }
    try {
      const result = Function('"use strict"; return (' + expression + ')')();
      this.printToOutput(outputElement, `${expression} = ${result}`, "info");
    } catch (e) {
      this.printToOutput(outputElement, `Error: Invalid expression "${expression}"`, "error");
    }
  }

  // Snake game
  initGame() {
    this.endGame();
    this.gameActive = true;
    const outputElement = this.terminals[this.activeTerminal].input.closest(".terminal-content").querySelector("[id^='output']");
    const gameContainer = document.createElement("div");
    gameContainer.className = "game-container";
    gameContainer.id = "snake-game-container";
    gameContainer.innerHTML = `
      <div class="game-instructions"><p>Snake Game: Use arrow keys to move.</p><p>Press P to pause, SPACE to restart, ESC to exit.</p></div>
      <div id="snake-game-score">Score: 0</div>
      <div id="snake-game-canvas"></div>
    `;
    outputElement.appendChild(gameContainer);
    this.initSnakeGame();
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  endGame() {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.gameHandler) { document.removeEventListener("keydown", this.gameHandler); this.gameHandler = null; }
    if (this.p5Instance) { this.p5Instance.remove(); this.p5Instance = null; }
    const gameContainer = document.getElementById("snake-game-container");
    if (gameContainer) gameContainer.remove();
  }

  initSnakeGame() {
    if (typeof p5 === "undefined") {
      const outputElement = this.terminals[this.activeTerminal].input.closest(".terminal-content").querySelector("[id^='output']");
      this.printToOutput(outputElement, "p5.js not loaded. Cannot start game.", "error");
      return;
    }
    const self = this;
    const sketch = (p) => {
      const gridSize = 20, canvasWidth = 400, canvasHeight = 300;
      let snake = [], food, direction = { x: 1, y: 0 }, nextDirection = { x: 1, y: 0 };
      let score = 0, gameOver = false, frameRate = 10, isPaused = false;

      p.setup = () => {
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent("snake-game-canvas");
        p.frameRate(frameRate);
        resetGame();
      };

      p.draw = () => {
        p.background(0);
        if (isPaused) { drawGrid(); p.fill(255); p.textSize(24); p.textAlign(p.CENTER, p.CENTER); p.text("PAUSED", canvasWidth/2, canvasHeight/2); return; }
        if (gameOver) { drawGrid(); p.fill(255,0,0); p.textSize(24); p.textAlign(p.CENTER, p.CENTER); p.text("Game Over!", canvasWidth/2, canvasHeight/2-20); p.textSize(16); p.text(`Score: ${score}`, canvasWidth/2, canvasHeight/2+20); p.text("Press SPACE to restart", canvasWidth/2, canvasHeight/2+50); return; }
        direction = nextDirection;
        moveSnake(); checkCollision(); drawGrid(); drawSnake(); drawFood(); updateScore();
      };

      p.keyPressed = () => {
        if (p.keyCode === 80) { isPaused = !isPaused; return false; }
        if (isPaused) return false;
        if (p.keyCode === p.UP_ARROW && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        else if (p.keyCode === p.DOWN_ARROW && direction.y !== -1) nextDirection = { x: 0, y: 1 };
        else if (p.keyCode === p.LEFT_ARROW && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        else if (p.keyCode === p.RIGHT_ARROW && direction.x !== -1) nextDirection = { x: 1, y: 0 };
        else if (p.keyCode === 32 && gameOver) resetGame();
        else if (p.keyCode === 27) self.endGame();
        if ([p.UP_ARROW, p.DOWN_ARROW, p.LEFT_ARROW, p.RIGHT_ARROW, 32, 27, 80].includes(p.keyCode)) return false;
      };

      function resetGame() { snake = [{x:5,y:5},{x:4,y:5},{x:3,y:5}]; direction = {x:1,y:0}; nextDirection = {x:1,y:0}; score = 0; gameOver = false; placeFood(); updateScore(); }
      function moveSnake() {
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        if (head.x < 0) head.x = Math.floor(canvasWidth/gridSize)-1;
        if (head.x >= canvasWidth/gridSize) head.x = 0;
        if (head.y < 0) head.y = Math.floor(canvasHeight/gridSize)-1;
        if (head.y >= canvasHeight/gridSize) head.y = 0;
        snake.unshift(head);
        if (head.x !== food.x || head.y !== food.y) snake.pop();
        else { placeFood(); score += 10; if (frameRate < 20) { frameRate += 0.5; p.frameRate(frameRate); } }
      }
      function checkCollision() { const head = snake[0]; for (let i=1;i<snake.length;i++) { if (head.x===snake[i].x && head.y===snake[i].y) { gameOver=true; return; } } }
      function placeFood() {
        let valid = false;
        while (!valid) { food = {x:Math.floor(p.random(canvasWidth/gridSize)), y:Math.floor(p.random(canvasHeight/gridSize))}; valid = !snake.some(s=>s.x===food.x&&s.y===food.y); }
      }
      function drawGrid() { p.stroke(30); p.strokeWeight(0.5); for(let x=0;x<canvasWidth;x+=gridSize){p.line(x,0,x,canvasHeight);} for(let y=0;y<canvasHeight;y+=gridSize){p.line(0,y,canvasWidth,y);} }
      function drawSnake() { snake.forEach((seg,i)=>{ p.fill(i===0?'#ffd93d':'#66d9ef'); p.noStroke(); p.rect(seg.x*gridSize,seg.y*gridSize,gridSize-2,gridSize-2,4); }); }
      function drawFood() { p.fill('#ff6b9d'); p.noStroke(); p.ellipse(food.x*gridSize+gridSize/2, food.y*gridSize+gridSize/2, gridSize-4, gridSize-4); }
      function updateScore() { const el = document.getElementById("snake-game-score"); if(el) el.textContent = `Score: ${score}`; }
    };
    this.p5Instance = new p5(sketch);
  }

  navigateFileSystem(path) {
    const parts = path.split("/").filter(Boolean);
    let current = this.fileSystem;
    for (const part of parts) { if (current.type !== "directory" || !current.contents[part]) return null; current = current.contents[part]; }
    return current;
  }
}

new TerminalResume();
