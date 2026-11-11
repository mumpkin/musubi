= Unsafe

#html.elem("script")[alert("script")]
#html.elem("a", attrs: (href: "javascript:alert(1)", onclick: "alert(2)"))[link]
#html.elem("iframe", attrs: (src: "https://example.org"))
#html.elem("img", attrs: (src: "java\tscript:alert(3)", onerror: "alert(4)"))
#html.elem("style")[body { display: none }]
#html.elem("div", attrs: (onmouseover: "alert(5)"))[#html.elem("object")[]]

Text that stays.
