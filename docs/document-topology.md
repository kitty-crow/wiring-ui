# Wiring document topology

The application distinguishes three concepts: device terminals, freely positionable anchors, and shared junction anchors. Cables store endpoint IDs, not drawing coordinates. Every cable can be repositioned and re-routed while retaining both endpoint identities.

Two cables that merely cross remain electrically isolated. A user-created junction is an explicit shared anchor. Removing a junction disconnects the cables without deleting them. Manual waypoints govern bends and cable-leg positions; the orthogonal router resolves the intervening legs automatically.

The canvas renderer, routing model, UI controls, storage, and document codec are separate modules. The initial sample is not hard-coded into the renderer.
