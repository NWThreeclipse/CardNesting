/* Card Nesting Power-Up for Trello
   Threeclipse Inc. — v1.0
   Allows parent-child card grouping with visual indicators */

// ── Helpers ──────────────────────────────────────────────

function getPluginData(t, cardId) {
  return t.get(cardId, 'shared', 'nesting').then(function(data) {
    return data || {};
  });
}

function setPluginData(t, cardId, data) {
  return t.set(cardId, 'shared', 'nesting', data);
}

function getCurrentCardData(t) {
  return t.card('id').then(function(card) {
    return getPluginData(t, card.id).then(function(data) {
      return { id: card.id, data: data };
    });
  });
}

// ── Core Operations ──────────────────────────────────────

function linkChild(t, parentId, childId) {
  // Update parent's childIds
  return getPluginData(t, parentId).then(function(parentData) {
    var children = parentData.childIds || [];
    if (children.indexOf(childId) === -1) {
      children.push(childId);
    }
    parentData.childIds = children;
    parentData.isParent = true;
    return setPluginData(t, parentId, parentData);
  }).then(function() {
    // Update child's parentId
    return getPluginData(t, childId).then(function(childData) {
      childData.parentId = parentId;
      childData.isChild = true;
      return setPluginData(t, childId, childData);
    });
  });
}

function unlinkChild(t, parentId, childId) {
  return getPluginData(t, parentId).then(function(parentData) {
    var children = parentData.childIds || [];
    var idx = children.indexOf(childId);
    if (idx > -1) children.splice(idx, 1);
    parentData.childIds = children;
    if (children.length === 0) {
      parentData.isParent = false;
    }
    return setPluginData(t, parentId, parentData);
  }).then(function() {
    return setPluginData(t, childId, {});
  });
}

// ── Popup Pages ──────────────────────────────────────────

// These are referenced by URL in popup calls

// ── Power-Up Init ────────────────────────────────────────

TrelloPowerUp.initialize({

  // ── Card Buttons (right side of card back) ──
  'card-buttons': function(t, options) {
    return getCurrentCardData(t).then(function(current) {
      var buttons = [];

      if (current.data.isChild) {
        // Child card: show unlink button
        buttons.push({
          icon: 'https://cdn-icons-png.flaticon.com/16/9961/9961218.png',
          text: 'Unlink from Parent',
          callback: function(tc) {
            var parentId = current.data.parentId;
            return unlinkChild(tc, parentId, current.id).then(function() {
              tc.alert({ message: 'Unlinked from parent card.', duration: 3 });
            });
          }
        });
      } else {
        // Not a child: can become parent or be added as child
        buttons.push({
          icon: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png',
          text: 'Add Children',
          callback: function(tc) {
            return tc.popup({
              title: 'Select Children',
              url: './pages/add-children.html',
              height: 400
            });
          }
        });

        buttons.push({
          icon: 'https://cdn-icons-png.flaticon.com/16/7268/7268647.png',
          text: 'Set Parent',
          callback: function(tc) {
            return tc.popup({
              title: 'Select Parent Card',
              url: './pages/set-parent.html',
              height: 400
            });
          }
        });
      }

      // Parent cards get "Gather Children" button
      if (current.data.isParent && (current.data.childIds || []).length > 0) {
        buttons.push({
          icon: 'https://cdn-icons-png.flaticon.com/16/4185/4185515.png',
          text: 'Gather Children Here',
          callback: function(tc) {
            return tc.card('id', 'idList').then(function(card) {
              var promises = (current.data.childIds || []).map(function(childId) {
                return window.Trello ? 
                  Promise.resolve() : // REST API would go here with auth
                  Promise.resolve();
              });
              tc.alert({ 
                message: 'Use the "Move children" feature from the board button to gather children. (REST API auth required for card moves)', 
                duration: 5 
              });
            });
          }
        });
      }

      return buttons;
    });
  },

  // ── Card Badges (front of card in list view) ──
  'card-badges': function(t, options) {
    return getCurrentCardData(t).then(function(current) {
      var badges = [];

      if (current.data.isParent) {
        var count = (current.data.childIds || []).length;
        badges.push({
          text: '📁 ' + count + (count === 1 ? ' child' : ' children'),
          color: 'blue'
        });
      }

      if (current.data.isChild) {
        badges.push({
          text: '↳ Child',
          color: 'sky'
        });
      }

      return badges;
    });
  },

  // ── Card Detail Badges (card back, below title) ──
  'card-detail-badges': function(t, options) {
    return getCurrentCardData(t).then(function(current) {
      var badges = [];

      if (current.data.isParent) {
        var count = (current.data.childIds || []).length;
        badges.push({
          title: 'Children',
          text: count + (count === 1 ? ' card' : ' cards'),
          color: 'blue',
          callback: function(tc) {
            return tc.popup({
              title: 'Child Cards',
              url: './pages/view-children.html',
              height: 300
            });
          }
        });
      }

      if (current.data.isChild) {
        badges.push({
          title: 'Parent',
          text: 'View Parent →',
          color: 'sky',
          callback: function(tc) {
            return tc.popup({
              title: 'Parent Card',
              url: './pages/view-parent.html',
              height: 200
            });
          }
        });
      }

      return badges;
    });
  },

  // ── Card Back Section ──
  'card-back-section': function(t, options) {
    return getCurrentCardData(t).then(function(current) {
      var childCount = (current.data.childIds || []).length;
      var baseHeight = 140;
      if (current.data.isParent) baseHeight = Math.min(140 + childCount * 36 + 44, 500);
      else if (current.data.isChild) baseHeight = 160;

      return {
        title: '🔗 Card Nesting',
        icon: '',
        content: {
          type: 'iframe',
          url: t.signUrl('./pages/card-section.html'),
          height: baseHeight
        }
      };
    });
  },

  // ── Board Buttons ──
  'board-buttons': function(t, options) {
    return [{
      icon: {
        dark: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png',
        light: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png'
      },
      text: 'Card Nesting',
      callback: function(tc) {
        return tc.popup({
          title: 'Card Nesting — Threeclipse',
          url: './pages/board-overview.html',
          height: 400
        });
      }
    }];
  }

}, {
  appKey: '', // Set your Trello API key here if using REST API features
  appName: 'Card Nesting by Threeclipse'
});
