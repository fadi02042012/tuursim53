

        let cart = JSON.parse(localStorage.getItem('cart')) || [];

        const cartIcon = document.querySelector('.cart-icon');
        const buttons = document.querySelectorAll('.btn');
        const cartBox = document.querySelector('.cart-box');
        const cartItemsContainer = document.querySelector('.cart-items');
        const totalText = document.querySelector('.total');
        const checkoutBtn = document.querySelector('.checkout-btn');

        function saveCart(){
            localStorage.setItem('cart', JSON.stringify(cart));
        }

        buttons.forEach((button)=>{

            button.addEventListener('click', function(e){

                e.preventDefault();

                const card = button.closest('.card');

                const name = card.querySelector('h2').innerText;
                const priceText = card.querySelector('.price').innerText;
                const image = card.querySelector('img').src;

                const price = parseFloat(priceText.replace('$',''));

                const product = {
                    name,
                    price,
                    image
                };

                cart.push(product);

                saveCart();

                cartIcon.setAttribute('data-count', cart.length);

                displayCart();

                alert(name + ' added to cart');

            });

        });

        function displayCart(){

            cartItemsContainer.innerHTML = '';

            let total = 0;

            if(cart.length === 0){
                cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
            }

            cart.forEach((item,index)=>{

                total += item.price;

                cartItemsContainer.innerHTML += `

                    <div class="cart-item">

                        <img src="${item.image}">

                        <div>
                            <h4>${item.name}</h4>
                            <p>$${item.price}</p>
                        </div>

                        <button onclick="removeItem(${index})">X</button>

                    </div>

                `;

            });

            totalText.innerHTML = 'Total: $' + total.toFixed(2);

        }

        function removeItem(index){

            cart.splice(index,1);

            saveCart();

            cartIcon.setAttribute('data-count', cart.length);

            displayCart();

        }

        cartIcon.addEventListener('click', ()=>{
            cartBox.classList.toggle('active');
        });

        checkoutBtn.addEventListener('click', ()=>{

            if(cart.length === 0){
                alert('Your cart is empty');
                return;
            }

            alert('Order placed successfully');

            cart = [];

            saveCart();

            cartIcon.setAttribute('data-count', 0);

            displayCart();

        });

        const loginForm = document.getElementById('loginForm');
        const message = document.getElementById('message');

        loginForm.addEventListener('submit', function(e){

            e.preventDefault();

            const username = document.getElementById('username').value;

            message.innerHTML = 'Welcome ' + username + ' Login Successful';

            loginForm.reset();

        });

        displayCart();

        cartIcon.setAttribute('data-count', cart.length);

  