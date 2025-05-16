console.log("🔧 Injected script loaded!");

window.arun1 = function () {
  console.log("🔧 Injecting script to override window.open...");
};

window.parent.arun2 = function () {
  console.log("🔧 Injecting script to override window.open...");
};
