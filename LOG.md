# Prompt Log

1. Before we begin, please create a file called LOG.md that stores each of my prompts.
2. I would like to create a web app that can be used on computer and mobile to help out users with color vision deficiency. This would include features such as a camera color identifier and an AI powered outfit-color matcher. Please ask me clarifying questions before moving on.
3. I decided to use a Claude API key instead, can this be configured?
4. Awesome. Does the prompt to the API include the fact that the user is colorblind?
5. Perfect. Is there any way we can get the outputed text from the API to match the markdown that it is giving us?
6. The response returned "## Outfit colors **Sage** and navy. - Strong texture [unsafe](javascript:alert(1)) <img src=x onerror=alert(1)>"
7. Before we continue, I would like to workshop alternative names for the project. Is there anything we could do that reflects it's goals to help those with CVD?
8. I like Palette Pal, especially because it reflects the use of the project as an assistant
9. Yes, please update the branding
10. Awesome, now lets move on to some small changes. In the upper left title, can we capitalize the first letters of the words? Additionally, can we include a rough name of colors in addition to the hex code on the pick a color screen? Finally, would we be able to add an "other" option to the What Are We Matching tab?
11. When I select other it asks for me to choose a valid garment type
12. Next, can we somehow retrieve the color suggestions in the response, perhaps asking for a hex code, and display example colors to the user?
13. It is now returning "The outfit suggestion service returned incomplete color suggestions. Please try again.", any ideas?
14. Alright, lets expand functionality. I would like for there to be a way that users can save a catalog, or closet, containing roughly the clothes they have. This would likely require some form of account sign up to save data. What do you think?
15. Awesome. Can we add the closet piece selector to a third tab in the lets find your match section and then move the closet itself into a seperate page?
16. Awesome! Can we update the header on the outfit matcher screen so that it is consitent with the My Closet screen?
17. Awesome, now lets take a look at allowing users to create an account to save sessions or transfer closet data across devices. How much work would that take to implement?
18. What are our deployment options looking like depending on how we implement the save sessions?
19. If we were to go with the vercel + supabase option, would we need a seperate backend host as well?
20. I have accounts with both supabase and vercel, so I think I would like to go with that option. What other information do you need to continue?
