#import <AppKit/AppKit.h>
#include <node_api.h>
#include <string.h>

// Electron returns a buffer containing the address of its NSView on macOS.
static napi_value PinWindow(napi_env env, napi_callback_info info) {
  size_t argc = 1, size = 0;
  napi_value handle;
  void *bytes = NULL;
  if (napi_get_cb_info(env, info, &argc, &handle, NULL, NULL) != napi_ok ||
      argc != 1 || napi_get_buffer_info(env, handle, &bytes, &size) != napi_ok ||
      size != sizeof(NSView *)) {
    napi_throw_type_error(env, NULL, "Expected an Electron native window handle");
    return NULL;
  }
  NSView *view;
  memcpy(&view, bytes, sizeof(view));
  NSWindow *window = view.window;
  // These three Mission Control behaviors are mutually exclusive.
  NSWindowCollectionBehavior flags = window.collectionBehavior;
  flags &= ~(NSWindowCollectionBehaviorManaged | NSWindowCollectionBehaviorTransient);
  window.collectionBehavior = flags | NSWindowCollectionBehaviorStationary;
  napi_value result;
  napi_get_undefined(env, &result);
  return result;
}

// Check the drag pasteboard's type only while a new mouse drag is in progress.
static napi_value FileDragActive(napi_env env, napi_callback_info info) {
  NSPasteboard *board = [NSPasteboard pasteboardWithName:NSPasteboardNameDrag];
  static NSInteger previousChange = -1;
  static BOOL active = NO;
  NSInteger change = board.changeCount;
  if ((NSEvent.pressedMouseButtons & 1) == 0) {
    active = NO;
  } else if (change != previousChange) {
    active = [board availableTypeFromArray:@[NSPasteboardTypeFileURL, NSPasteboardTypeString, NSPasteboardTypeHTML,
                                             NSPasteboardTypeRTF, NSPasteboardTypeURL, NSPasteboardTypePNG,
                                             NSPasteboardTypeTIFF, @"NSFilenamesPboardType"]] != nil;
  }
  previousChange = change;
  napi_value result;
  napi_get_boolean(env, active, &result);
  return result;
}

NAPI_MODULE_INIT() {
  napi_value drag;
  napi_create_function(env, "fileDragActive", NAPI_AUTO_LENGTH, FileDragActive, NULL, &drag);
  napi_set_named_property(env, exports, "fileDragActive", drag);
  napi_value pin;
  napi_create_function(env, "pin", NAPI_AUTO_LENGTH, PinWindow, NULL, &pin);
  napi_set_named_property(env, exports, "pin", pin);
  return exports;
}
