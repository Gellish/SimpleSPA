import { pageReducer, userReducer } from '/src/lib/cqrs/projection.js';

export const COLLECTIONS = {
    page: {
        label: 'Post',
        reducer: pageReducer,
        events: {
        "create": "PAGE_CREATED",
        "update": "PAGE_UPDATED"
},
        fields: [
        {
                "name": "title",
                "label": "Title",
                "type": "text",
                "required": true
        },
        {
                "name": "date",
                "label": "Publish Date",
                "type": "date"
        },
        {
                "name": "tags",
                "label": "Tags",
                "type": "text"
        },
        {
                "name": "slug",
                "label": "Slug",
                "type": "text"
        },
        {
                "name": "description",
                "label": "Description",
                "type": "textarea"
        },
        {
                "name": "content",
                "label": "Content",
                "type": "markdown"
        }
]
    },
    user: {
        label: 'User Account',
        reducer: userReducer,
        events: {
        "create": "USER_CREATED",
        "update": "USER_UPDATED"
},
        fields: [
        {
                "name": "avatar",
                "label": "Profile Picture",
                "type": "image"
        },
        {
                "name": "name",
                "label": "Full Name",
                "type": "text",
                "required": true
        },
        {
                "name": "email",
                "label": "Email Address",
                "type": "email",
                "required": true
        },
        {
                "name": "role",
                "label": "Role",
                "type": "select",
                "options": [
                        "user",
                        "moderator",
                        "admin"
                ],
                "default": "user"
        },
        {
                "name": "status",
                "label": "Status",
                "type": "select",
                "options": [
                        "active",
                        "inactive",
                        "pending"
                ],
                "default": "active"
        },
        {
                "name": "isVerified",
                "label": "Verified User",
                "type": "boolean",
                "default": false
        }
]
    },
    category: {
        label: 'Category',
        reducer: (state, event) => {
                        if (event.eventType === 'CATEGORY_CREATED' || event.eventType === 'CATEGORY_UPDATED') {
                                return { ...state, ...event.payload, id: event.aggregateId, version: event.version };
                        }
                        return state;
                },
        events: {
        "create": "CATEGORY_CREATED",
        "update": "CATEGORY_UPDATED"
},
        fields: [
        {
                "name": "name",
                "label": "Category Name",
                "type": "text",
                "required": true
        },
        {
                "name": "description",
                "label": "Description",
                "type": "textarea"
        },
        {
                "name": "color",
                "label": "Color Hex",
                "type": "color",
                "default": "#007bff"
        }
]
    },
};

export function getCollection(type) { return COLLECTIONS[type] || null; }
